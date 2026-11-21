"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import * as React from "react";

import { cn } from "@/lib/utils";

function Slider({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const thumbValues = props.value ?? props.defaultValue;
  const thumbCount = Array.isArray(thumbValues) ? thumbValues.length : 1;

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      thumbAlignment="edge"
      className={cn(
        "relative flex w-full touch-none items-center select-none data-disabled:cursor-not-allowed data-disabled:opacity-45",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Control
        data-slot="slider-control"
        className="flex w-full cursor-pointer items-center py-2 data-disabled:cursor-not-allowed"
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative h-3 w-full overflow-hidden rounded-full border-2 border-border bg-secondary-background shadow-[2px_2px_0_#141414]"
        >
          <SliderPrimitive.Indicator data-slot="slider-indicator" className="h-full bg-main" />
        </SliderPrimitive.Track>
        {Array.from({ length: thumbCount }, (_, idx) => (
          <SliderPrimitive.Thumb
            key={idx}
            index={idx}
            data-slot="slider-thumb"
            className="block size-5 rounded-full border-[2.5px] border-border bg-secondary-background shadow-[2px_2px_0_#141414] transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none data-dragging:scale-110 data-dragging:bg-main"
          />
        ))}
      </SliderPrimitive.Control>
      {children}
    </SliderPrimitive.Root>
  );
}

export { Slider };
