import { Icon3d, type IconName } from "./Icon3d";
import { StoreBadges } from "./StoreBadges";

function Float({ name, className }: { name: IconName; className: string }) {
  return <Icon3d name={name} size={144} className={`absolute ${className}`} />;
}

export function Cta() {
  return (
    <section className="pb-14 md:pb-[72px] lg:pb-24">
      <div className="mx-auto w-full max-w-[1440px] px-4 md:px-8 lg:px-20">
        <div className="relative flex flex-col items-center gap-5 overflow-hidden rounded-[2.5rem] bg-linear-to-br from-brand-primary to-brand-gradient-to px-6 pt-[110px] pb-14 text-center text-text-inverse md:rounded-[3.5rem] md:px-12 md:pt-[100px] md:pb-[72px]">
          <h2 className="font-heading text-headline-4 font-bold md:text-headline-3 lg:text-headline-2">
            Snap it. We’ll sort it.
          </h2>
          <p className="max-w-[640px] text-body-2 lg:text-body-1">
            Use Notarik on the web today. The iOS and Android apps are coming soon.
          </p>
          <StoreBadges className="justify-center" />
          <Float name="coffee" className="top-4 left-5 w-[84px] -rotate-[12deg] md:top-5 md:left-10 md:w-[110px] lg:top-10 lg:left-[60px] lg:w-[130px]" />
          <Float name="camera" className="top-4 right-5 w-[84px] rotate-[10deg] md:top-5 md:right-10 md:w-[110px] lg:top-12 lg:right-[60px] lg:w-[130px]" />
          <Float name="budget" className="bottom-6 left-[140px] hidden w-[150px] rotate-[8deg] lg:block" />
          <Float name="receipt" className="right-[140px] bottom-4 hidden w-[130px] -rotate-[8deg] lg:block" />
        </div>
      </div>
    </section>
  );
}
