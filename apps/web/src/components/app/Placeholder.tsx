import Image from "next/image";
import { Card, PageTitle } from "./ui";

export function Placeholder({ title, icon, text }: { title: string; icon: string; text: string }) {
  return (
    <>
      <PageTitle>{title}</PageTitle>
      <Card className="flex flex-col items-center gap-3 py-14 text-center">
        <Image src={`/icons/${icon}.png`} alt="" width={128} height={128} className="size-24 object-contain" />
        <p className="font-heading text-body-1 font-bold">Coming soon to the web</p>
        <p className="max-w-sm text-caption text-text-secondary">{text}</p>
      </Card>
    </>
  );
}
