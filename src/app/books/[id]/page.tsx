import { BookDetailClient } from "@/features/books/BookDetailClient";

interface BookPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookPage({ params }: BookPageProps): Promise<React.ReactElement> {
  const { id } = await params;
  return <BookDetailClient bookId={id} />;
}
