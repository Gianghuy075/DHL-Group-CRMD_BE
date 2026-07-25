import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';

import { FacebookTask } from './entities/facebook-task.entity';
import { TaskSubmission } from './entities/task-submission.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { WalletService } from '../wallet/wallet.service';

function extractFacebookTargetId(url: string): string {
  const match = url.match(/(?:profile\.php\?id=|\/)(\d{5,})/);
  return match ? match[1] : '';
}

@Injectable()
export class FacebookTasksService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(FacebookTask)
    private readonly taskRepo: Repository<FacebookTask>,
    @InjectRepository(TaskSubmission)
    private readonly submissionRepo: Repository<TaskSubmission>,
    private readonly wallet: WalletService,
  ) {}

  /** Creator posts a task: charge their wallet and store the task atomically. */
  async createTask(creatorId: string, dto: CreateTaskDto) {
    const quantity = Number(dto.targetQuantity);
    const price = Number(dto.unitPrice);
    const totalCost = quantity * price;

    return this.dataSource.transaction(async (manager) => {
      await this.wallet.debit(
        manager,
        creatorId,
        totalCost,
        `Đăng nhiệm vụ ${dto.taskType} (x${quantity})`,
      );

      const task = await manager.save(
        manager.create(FacebookTask, {
          creator_id: creatorId,
          task_type: dto.taskType,
          post_url: dto.postUrl.trim(),
          facebook_target_id: extractFacebookTargetId(dto.postUrl),
          target_quantity: quantity,
          completed_quantity: 0,
          unit_price: price,
          total_cost: totalCost,
          status: 'active',
          note: dto.note?.trim() || null,
        }),
      );

      return { success: true, task, totalCost };
    });
  }

  /** Marketplace: active tasks not created by, or already taken by, this worker. */
  async listMarketplace(workerId: string, taskType?: string) {
    const qb = this.taskRepo
      .createQueryBuilder('t')
      .where('t.status = :status', { status: 'active' })
      .andWhere('t.creator_id <> :workerId', { workerId })
      .andWhere('t.completed_quantity < t.target_quantity')
      .andWhere(
        `NOT EXISTS (SELECT 1 FROM task_submissions s WHERE s.task_id = t.id AND s.worker_id = :workerId)`,
        { workerId },
      )
      .orderBy('t.created_at', 'DESC');

    if (taskType) {
      qb.andWhere('t.task_type = :taskType', { taskType });
    }

    return { data: await qb.getMany() };
  }

  /** Tasks created by this user, with their submissions. */
  async listMine(creatorId: string) {
    const tasks = await this.taskRepo.find({
      where: { creator_id: creatorId },
      order: { created_at: 'DESC' },
    });
    const ids = tasks.map((t) => t.id);
    const submissions = ids.length
      ? await this.submissionRepo
          .createQueryBuilder('s')
          .where('s.task_id IN (:...ids)', { ids })
          .getMany()
      : [];

    const byTask = new Map<string, TaskSubmission[]>();
    for (const s of submissions) {
      if (!s.task_id) continue;
      const list = byTask.get(s.task_id) ?? [];
      list.push(s);
      byTask.set(s.task_id, list);
    }

    return {
      data: tasks.map((t) => ({ ...t, task_submissions: byTask.get(t.id) ?? [] })),
    };
  }

  /**
   * Worker submits proof. Manual review only (no auto-API): status stays
   * 'pending' until an admin approves. Blocks self-farming and duplicates.
   */
  async submitTaskWork(taskId: string, workerId: string, proofImageUrl?: string) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task || task.status !== 'active') {
      throw new BadRequestException('Nhiệm vụ này đã hoàn thành hoặc không còn hoạt động.');
    }
    if (task.creator_id === workerId) {
      throw new ForbiddenException('Không thể tự làm nhiệm vụ của chính mình.');
    }

    // Guard against duplicates even if the DB lacks the unique(task_id, worker_id)
    // constraint. (The unique index is still the authoritative race-safe guard.)
    const existing = await this.submissionRepo.findOne({
      where: { task_id: taskId, worker_id: workerId },
    });
    if (existing) {
      throw new BadRequestException('Bạn đã nộp bằng chứng cho nhiệm vụ này rồi.');
    }

    try {
      const submission = await this.submissionRepo.save(
        this.submissionRepo.create({
          task_id: taskId,
          worker_id: workerId,
          proof_image_url: proofImageUrl || null,
          proof_data: { simulated: false, source: 'manual_proof' },
          status: 'pending',
          reward_amount: task.unit_price,
          verified_via_api: false,
        }),
      );
      return {
        success: true,
        submission,
        verifiedViaApi: false,
        message: 'Đã gửi bằng chứng nhiệm vụ, đang chờ quản trị viên đối soát trả thưởng.',
      };
    } catch (err) {
      if (err instanceof QueryFailedError) {
        throw new BadRequestException('Bạn đã nộp bằng chứng cho nhiệm vụ này rồi.');
      }
      throw err;
    }
  }

  /** Creator cancels their task; refund the unperformed portion atomically. */
  async cancelTask(taskId: string, creatorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const task = await manager.findOne(FacebookTask, {
        where: { id: taskId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!task) throw new NotFoundException('Không tìm thấy nhiệm vụ.');
      if (task.creator_id !== creatorId) {
        throw new ForbiddenException('Bạn không có quyền hủy nhiệm vụ này.');
      }
      if (task.status !== 'active') {
        throw new BadRequestException('Nhiệm vụ không ở trạng thái hoạt động.');
      }

      const remainingQty = Math.max(0, task.target_quantity - task.completed_quantity);
      const refundAmount = remainingQty * Number(task.unit_price);

      task.status = 'cancelled';
      await manager.save(task);

      if (refundAmount > 0) {
        await this.wallet.credit(
          manager,
          creatorId,
          refundAmount,
          'refund',
          `Hoàn tiền hủy nhiệm vụ FB #${taskId.slice(0, 8)}`,
        );
      }

      return { success: true, refundAmount };
    });
  }

  // ---- Admin ----

  async listPendingSubmissions() {
    const data = await this.submissionRepo
      .createQueryBuilder('s')
      .leftJoinAndMapOne('s.task', FacebookTask, 't', 't.id = s.task_id')
      .where('s.status = :status', { status: 'pending' })
      .orderBy('s.created_at', 'ASC')
      .getMany();
    return { data };
  }

  /** Admin approves a submission: credit the worker + advance task counters. */
  async approveSubmission(submissionId: string) {
    return this.dataSource.transaction(async (manager) => {
      const submission = await manager.findOne(TaskSubmission, {
        where: { id: submissionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!submission) throw new NotFoundException('Không tìm thấy bằng chứng.');
      if (submission.status !== 'pending') {
        throw new BadRequestException('Bằng chứng đã được xử lý.');
      }
      if (!submission.task_id || !submission.worker_id) {
        throw new BadRequestException('Bằng chứng thiếu thông tin nhiệm vụ.');
      }

      submission.status = 'approved';
      submission.verified_via_api = false;
      await manager.save(submission);

      const task = await manager.findOne(FacebookTask, {
        where: { id: submission.task_id },
        lock: { mode: 'pessimistic_write' },
      });
      if (task) {
        task.completed_quantity += 1;
        if (task.completed_quantity >= task.target_quantity) {
          task.status = 'completed';
        }
        await manager.save(task);
      }

      await this.wallet.credit(
        manager,
        submission.worker_id,
        Number(submission.reward_amount),
        'bonus',
        'Thưởng hoàn thành nhiệm vụ chéo Facebook',
      );

      return { success: true };
    });
  }

  async rejectSubmission(submissionId: string) {
    const submission = await this.submissionRepo.findOne({ where: { id: submissionId } });
    if (!submission) throw new NotFoundException('Không tìm thấy bằng chứng.');
    if (submission.status !== 'pending') {
      throw new BadRequestException('Bằng chứng đã được xử lý.');
    }
    submission.status = 'rejected';
    await this.submissionRepo.save(submission);
    return { success: true };
  }
}
