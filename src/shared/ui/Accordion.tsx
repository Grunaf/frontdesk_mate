"use client"

import * as React from "react"
import { Accordion as AccordionPrimitive } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons"

const accordionTriggerVariants = cva(
  "group/accordion-trigger relative flex flex-1 items-start justify-between gap-6 border border-transparent text-left transition-all outline-none hover:underline disabled:pointer-events-none disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted-foreground",
  {
    variants: {
      size: {
        default: "p-2 text-xs/relaxed font-medium",
        section: "px-2 py-2 text-base font-semibold text-foreground hover:no-underline",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

function Accordion({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-md border",
        className
      )}
      {...props}
    />
  )
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("not-last:border-b data-open:bg-muted/50", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  size,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger> &
  VariantProps<typeof accordionTriggerVariants>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(accordionTriggerVariants({ size }), className)}
        {...props}
      >
        {children}
        <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} data-slot="accordion-trigger-icon" className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden" />
        <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} data-slot="accordion-trigger-icon" className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const innerRef = React.useRef<HTMLDivElement>(null)

  React.useLayoutEffect(() => {
    const contentEl = contentRef.current
    const innerEl = innerRef.current
    if (!contentEl || !innerEl) return

    const clearClosedHeight = () => {
      contentEl.style.removeProperty("height")
    }

    const applyOpenHeight = (): boolean => {
      if (contentEl.getAttribute("data-state") !== "open") {
        return true
      }

      const measured = innerEl.scrollHeight
      if (measured <= 0) {
        return false
      }

      const height = `${measured}px`
      contentEl.style.setProperty("--radix-accordion-content-height", height)
      contentEl.style.height = height
      return true
    }

    const remeasureOpenHeight = () => {
      if (contentEl.getAttribute("data-state") !== "open") {
        return
      }

      if (applyOpenHeight()) {
        requestAnimationFrame(() => {
          applyOpenHeight()
        })
        return
      }

      let attempts = 0
      const retry = () => {
        if (contentEl.getAttribute("data-state") !== "open") {
          return
        }
        if (applyOpenHeight() || attempts >= 8) {
          return
        }
        attempts += 1
        requestAnimationFrame(retry)
      }
      requestAnimationFrame(retry)
    }

    const syncHeightFromState = () => {
      if (contentEl.getAttribute("data-state") !== "open") {
        clearClosedHeight()
        return
      }
      applyOpenHeight()
      remeasureOpenHeight()
    }

    syncHeightFromState()

    const observer = new ResizeObserver(() => {
      if (contentEl.getAttribute("data-state") === "open") {
        applyOpenHeight()
      }
    })
    observer.observe(innerEl)

    const stateObserver = new MutationObserver(syncHeightFromState)
    stateObserver.observe(contentEl, { attributes: true, attributeFilter: ["data-state"] })

    return () => {
      observer.disconnect()
      stateObserver.disconnect()
    }
  }, [])

  return (
    <AccordionPrimitive.Content
      ref={contentRef}
      data-slot="accordion-content"
      className={cn(
        "overflow-hidden px-2 text-xs/relaxed data-open:animate-accordion-down data-closed:animate-accordion-up",
        className
      )}
      {...props}
    >
      <div
        ref={innerRef}
        className="pt-0 pb-4 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4"
      >
        {children}
      </div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
