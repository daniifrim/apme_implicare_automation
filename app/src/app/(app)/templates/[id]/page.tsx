import TemplateDetailPage from "@/app/dashboard/templates/[id]/page";

export default function TemplatePage(props: { params: { id: string } }) {
  return <TemplateDetailPage {...props} />;
}
