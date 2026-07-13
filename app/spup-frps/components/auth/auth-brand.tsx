import Image from 'next/image'

export function BrandLogo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="relative shrink-0">
      <div
        className={`absolute inset-0 scale-125 rounded-full blur-2xl ${
          dark
            ? 'bg-[radial-gradient(circle,rgba(255,213,79,0.58)_0%,rgba(255,213,79,0.26)_42%,transparent_72%)]'
            : 'bg-[radial-gradient(circle,rgba(255,213,79,0.38)_0%,rgba(255,213,79,0.16)_45%,transparent_72%)]'
        }`}
      />
      <div
        className={`relative flex items-center justify-center overflow-hidden rounded-full border ${
          dark
            ? 'size-12 border-yellow-200/45 bg-white/10 shadow-[0_0_38px_rgba(255,213,79,0.38)] backdrop-blur-sm sm:size-14'
            : 'size-12 border-yellow-300/50 bg-white shadow-[0_0_28px_rgba(255,213,79,0.32)] sm:size-14'
        }`}
      >
        <div className="relative size-10 sm:size-12">
          <Image
            src="/spup-logo.png"
            alt="St. Paul University Philippines"
            fill
            className="object-contain"
            priority
            sizes="(min-width: 640px) 48px, 40px"
          />
        </div>
      </div>
    </div>
  )
}
