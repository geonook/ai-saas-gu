import { cva } from "class-variance-authority"

/**
 * Dialog positioning and sizing variants using CVA (Class Variance Authority)
 * Provides consistent styling patterns for all dialog components
 */
export const dialogContentVariants = cva(
  // Base classes applied to all dialog instances
  "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-50 grid gap-4 rounded-lg border shadow-lg duration-200 max-h-[90vh] overflow-auto",
  {
    variants: {
      // Positioning strategies
      positioning: {
        center: "fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]",
        "center-safe": "fixed inset-0 m-auto w-fit h-fit", // Better for mobile keyboards
        "top-center": "fixed top-[10%] left-[50%] translate-x-[-50%]",
        "viewport-center": "fixed top-[50vh] left-[50vw] translate-x-[-50%] translate-y-[-50%]"
      },
      
      // Size variants
      size: {
        xs: "w-full max-w-xs",
        sm: "w-full max-w-sm", 
        md: "w-full max-w-md",
        lg: "w-full max-w-lg",
        xl: "w-full max-w-xl",
        "2xl": "w-full max-w-2xl",
        "3xl": "w-full max-w-3xl",
        "4xl": "w-full max-w-4xl",
        "5xl": "w-full max-w-5xl",
        "6xl": "w-full max-w-6xl",
        "7xl": "w-full max-w-7xl",
        full: "w-full max-w-[calc(100vw-2rem)]",
        screen: "w-screen h-screen max-w-none rounded-none"
      },
      
      // Mobile-specific handling
      mobile: {
        default: "max-w-[calc(100%-2rem)]",
        margins: "mx-4 w-[calc(100%-2rem)]",
        "large-margins": "mx-6 w-[calc(100%-3rem)]",
        fullscreen: "mx-0 w-full h-full rounded-none sm:mx-4 sm:w-[calc(100%-2rem)] sm:h-auto sm:rounded-lg"
      },
      
      // Padding variants
      padding: {
        none: "p-0",
        sm: "p-4",
        md: "p-6", 
        lg: "p-8",
        xl: "p-10"
      },
      
      // Animation variants
      animation: {
        default: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        slide: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%]",
        fade: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        none: ""
      }
    },
    
    // Default values
    defaultVariants: {
      positioning: "center",
      size: "lg",
      mobile: "default", 
      padding: "md",
      animation: "default"
    },
    
    // Compound variants for specific combinations
    compoundVariants: [
      // Mobile fullscreen for large dialogs
      {
        size: ["4xl", "5xl", "6xl", "7xl", "full", "screen"],
        mobile: "default",
        class: "sm:mx-4 sm:w-[calc(100%-2rem)]"
      },
      
      // Center-safe positioning for mobile
      {
        positioning: "center-safe",
        mobile: "default",
        class: "max-h-[90vh] max-w-[90vw]"
      }
    ]
  }
)

/**
 * Dialog overlay variants for consistent backdrop styling
 */
export const dialogOverlayVariants = cva(
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50",
  {
    variants: {
      backdrop: {
        default: "bg-black/50",
        light: "bg-black/25", 
        heavy: "bg-black/75",
        blur: "bg-black/25 backdrop-blur-sm",
        "blur-heavy": "bg-black/50 backdrop-blur-md"
      }
    },
    defaultVariants: {
      backdrop: "default"
    }
  }
)

/**
 * Type exports for TypeScript support
 */
export type DialogContentVariants = Parameters<typeof dialogContentVariants>[0]
export type DialogOverlayVariants = Parameters<typeof dialogOverlayVariants>[0]