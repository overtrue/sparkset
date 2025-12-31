import { z } from 'zod';

/**
 * 本地认证验证器
 */

// 登录验证
export const localLoginSchema = z.object({
  username: z.string().min(3, '用户名至少需要3个字符'),
  password: z.string().min(6, '密码至少需要6个字符'),
});

// 注册验证
export const localRegisterSchema = z.object({
  username: z.string().min(3, '用户名至少需要3个字符').max(50, '用户名不能超过50个字符'),
  password: z.string().min(6, '密码至少需要6个字符').max(100, '密码不能超过100个字符'),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  displayName: z.string().optional().or(z.literal('')),
});

// 类型导出
export type LocalLoginInput = z.infer<typeof localLoginSchema>;
export type LocalRegisterInput = z.infer<typeof localRegisterSchema>;
