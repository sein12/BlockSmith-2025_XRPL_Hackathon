import { Card, CardContent } from "@/components/ui/card";

type Props = {
  title: string;
  desc?: string;
  icon?: React.ReactNode;
  className?: string;
};

export default function EmptyState({ title, desc, icon, className }: Props) {
  return (
    <Card className={className}>
      <CardContent className="py-8 flex flex-col items-center text-center gap-2">
        {icon && <div className="text-3xl">{icon}</div>}
        <div className="text-base font-medium">{title}</div>
        {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
      </CardContent>
    </Card>
  );
}
