'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardsApi } from '@/lib/api/dashboards';
import { toast } from 'sonner';
import { RiArrowLeftLine } from '@remixicon/react';

export default function NewDashboardPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('请输入仪表盘名称');
      return;
    }

    try {
      setLoading(true);
      const dashboard = await dashboardsApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
      });
      toast.success('仪表盘创建成功');
      router.push(`/dashboards/${dashboard.id}`);
    } catch (error) {
      toast.error('创建仪表盘失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="新建仪表盘"
        description="创建一个新的数据可视化仪表盘"
        action={
          <Button variant="outline" onClick={() => router.back()}>
            <RiArrowLeftLine className="h-4 w-4 mr-2" />
            返回
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
          <CardDescription>填写仪表盘的基本信息</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">名称 *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入仪表盘名称"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请输入仪表盘描述（可选）"
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                取消
              </Button>
              <Button type="submit" disabled={loading}>
                创建
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
