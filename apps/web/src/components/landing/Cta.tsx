import { Icon3d, type IconName } from "./Icon3d";
import { reveal } from "./motion";
import { StoreBadges } from "./StoreBadges";

function Float({ name, className, float }: { name: IconName; className: string; float: number }) {
  return <Icon3d name={name} size={144} float={float} className={`absolute ${className}`} />;
}

export function Cta() {
  return (
    <section className="pb-14 md:pb-[72px] xl:pb-24">
      <div className="mx-auto w-full max-w-[1440px] px-4 md:px-8 xl:px-20">
        <div className="relative flex flex-col items-center gap-5 overflow-hidden rounded-[2.5rem] bg-linear-to-br from-brand-primary to-brand-gradient-to px-6 pt-[110px] pb-14 text-center text-text-inverse md:rounded-[3.5rem] md:px-12 md:pt-[100px] md:pb-[72px]">
          <h2 className="font-heading text-headline-4 font-bold md:text-headline-3 xl:text-headline-2" {...reveal()}>
            Snap it. We’ll sort it.
          </h2>
          <p className="max-w-[640px] text-body-2 xl:text-body-1" {...reveal(120)}>
            Use Notarik on the web today. The iOS and Android apps are coming soon.
          </p>
          <div {...reveal(240)}>
            <StoreBadges className="items-center" tone="inverse" />
          </div>
          <Float float={0} name="coffee" className="top-4 left-5 w-[84px] -rotate-[12deg] md:top-5 md:left-10 md:w-[110px] xl:top-10 xl:left-[60px] xl:w-[130px]" />
          <Float float={0.8} name="camera" className="top-4 right-5 w-[84px] rotate-[10deg] md:top-5 md:right-10 md:w-[110px] xl:top-12 xl:right-[60px] xl:w-[130px]" />
          <Float float={1.4} name="budget" className="bottom-6 left-[140px] hidden w-[150px] rotate-[8deg] xl:block" />
          <Float float={0.4} name="receipt" className="right-[140px] bottom-4 hidden w-[130px] -rotate-[8deg] xl:block" />
        </div>
      </div>
    </section>
  );
}
