import Logo from "@/assets/logo.png"

export function ClassmatesLogo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2.5">
        <img src={Logo} alt="SPAS" className="size-8 shrink-0" />
        <div>
          <span className="block font-heading text-base font-bold tracking-tight text-foreground">
            SPAS
          </span>
          <span className="block text-[10px] tracking-wide text-muted-foreground uppercase">
            Academic operations
          </span>
        </div>
      </div>
    </div>
  )
}
