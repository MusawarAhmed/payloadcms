import React from 'react'
import type { Media as MediaType } from '@/payload-types'
import { Media } from '@/components/Media'

type Stat = {
    value: string
    label: string
    id?: string
}

type Props = {
    title?: string
    description?: string
    backgroundImage?: MediaType | string | null
    stats?: Stat[]
}

export const StatsSectionComponent: React.FC<Props> = ({
    title,
    description,
    backgroundImage,
    stats = []
}) => {
    return (
        <section className="relative py-24 bg-[#0A0A0A] overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0 z-0 bg-linear-to-br from-[#381926] from-1% to-[#05060F] to-100%" />
            
            {backgroundImage && (
                <div className="absolute inset-0 z-0 opacity-50">
                     <Media 
                        resource={backgroundImage}
                        className="object-cover object-center w-full h-full"
                        fill
                    />
                </div>
            )}

            <div className="container relative z-10 text-center flex flex-col gap-10">
                <div className="mx-auto space-y-6 max-w-4xl">
                    <h2 className="text-[28px] md:text-[48px] font-bold text-white leading-tight">
                        {title}
                    </h2>
                    <p className="text-[16px] font-normal text-white/70 mx-auto max-w-2xl">
                        {description}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                    {stats.map((stat, index) => (
                        <div
                            key={stat.id || index}
                            className="bg-white/10 border border-white/10 rounded-[4px] backdrop-blur-sm py-8 md:py-14 px-10 md:px-14 flex flex-col items-center justify-center space-y-4 transition-all duration-500 group hover:bg-white/15"
                        >
                            <span className="text-[40px] md:text-[64px] font-bold text-white leading-none group-hover:scale-105 transition-transform duration-500">
                                {stat.value}
                            </span>
                            <p className="text-[14px] md:text-[16px] text-white leading-relaxed">
                                {stat.label}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 z-1 bg-linear-to-b from-black/20 via-transparent to-black/20 pointer-events-none" />
        </section>
    );
}
