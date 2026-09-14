import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SectionCardProps = {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
};

export function SectionCard({
  children,
  description,
  eyebrow,
  title,
}: SectionCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <Badge className="w-fit" variant="secondary">
          {eyebrow}
        </Badge>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
