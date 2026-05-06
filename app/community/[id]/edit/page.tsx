import { mockPosts } from "@/components/community/CommunityMock";
import CommunityEditForm from "@/components/community/CommunityEditForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CommunityEditPage({ params }: Props) {
  const { id } = await params;

  const post = mockPosts.find((item) => String(item.id) === String(id));

  if (!post) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50/70 via-white to-white px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-4xl rounded-3xl border border-blue-100 bg-white p-10 text-center text-slate-500">
          수정할 게시글을 찾을 수 없습니다.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50/70 via-white to-white px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <CommunityEditForm post={post} />
      </div>
    </main>
  );
}