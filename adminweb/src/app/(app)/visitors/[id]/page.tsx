import VisitorDetail from "./visitor-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VisitorDetail id={id} />;
}
