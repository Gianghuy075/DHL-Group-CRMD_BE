import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { TASK_TYPE_IDS } from '../task-types';

export class CreateTaskDto {
  @IsIn(TASK_TYPE_IDS as unknown as string[])
  taskType: string;

  @IsString()
  postUrl: string;

  @IsInt()
  @Min(1, { message: 'Số lượng cần làm phải là số nguyên > 0.' })
  targetQuantity: number;

  @IsNumber()
  @Min(100, { message: 'Đơn giá mỗi lượt tối thiểu là 100 đ.' })
  unitPrice: number;

  @IsOptional()
  @IsString()
  note?: string;
}
