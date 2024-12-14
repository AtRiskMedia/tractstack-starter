/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  theme: {
    screens: {
      xs: "0px",
      md: "801px",
      xl: "1367px",
    },
    extend: {
      maxWidth: {
        '80%': "80%",
      },
      zIndex: {
        1: "101",
        2: "102",
        3: "103",
        4: "104",
        5: "105",
        6: "106",
        7: "107",
        8: "108",
        9: "109",
        10: "110",
        20: "210",
        30: "310",
        40: "410",
        50: "510",
        70: "700",
        90: "900",
        99: "999",
        101: "1001",
        102: "1002",
        103: "1003",
        104: "1004",
        105: "1005",
        999: "9999",
        9002: "9002",
      },
      colors: {
        mywhite: "#fcfcfc",
        myoffwhite: "#e3e3e3",
        mylightgrey: "#a7b1b7",
        myblue: "#293f58",
        mygreen: "#c8df8c",
        myorange: "#f58333",
        mydarkgrey: "#393d34",
        myblack: "#10120d",
        "brand-1": "var(--brand-1)",
        "brand-2": "var(--brand-2)",
        "brand-3": "var(--brand-3)",
        "brand-4": "var(--brand-4)",
        "brand-5": "var(--brand-5)",
        "brand-6": "var(--brand-6)",
        "brand-7": "var(--brand-7)",
        "brand-8": "var(--brand-8)",
      },
      fontSize: {
        xs: "0.75rem",
        sm: "0.875rem",
        base: "1rem",
        lg: "1.125rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "1.875rem",
        "4xl": "2.25rem",
        "5xl": "3rem",
        "6xl": "3.75rem",
        "7xl": "4.5rem",
        "8xl": "6rem",
        "9xl": "8rem",
        rxs: "calc(var(--scale) * 0.75rem)",
        rsm: "calc(var(--scale) * 0.875rem)",
        rbase: "calc(var(--scale) * 1rem)",
        rlg: "calc(var(--scale) * 1.125rem)",
        rxl: "calc(var(--scale) * 1.25rem)",
        r2xl: "calc(var(--scale) * 1.5rem)",
        r3xl: "calc(var(--scale) * 1.875rem)",
        r4xl: "calc(var(--scale) * 2.5rem)",
        r5xl: "calc(var(--scale) * 3rem)",
        r6xl: "calc(var(--scale) * 3.75rem)",
        r7xl: "calc(var(--scale) * 4.5rem)",
        r8xl: "calc(var(--scale) * 6rem)",
        r9xl: "calc(var(--scale) * 8rem)",
      },
      animation: {
        fadeOut: "fadeOut 1s forwards",
        fadeIn: "fadeIn 1s ease-in",
        fadeInUp: "fadeInUp 1s ease-in",
        fadeInRight: "fadeInRight 1s ease-in",
        fadeInLeft: "fadeInLeft 1s ease-in",
        bounceIn: "bounce 1s ease-in-out 4.5",
        wig: "wiggle 1s ease-in-out infinite",
      },
      keyframes: {
        fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        fadeIn: {
          "0%": { opacity: ".25" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { transform: "translate3d(0, 10px, 0)", opacity: ".25" },
          "100%": { transform: "translate3d(0, 0, 0)", opacity: "1" },
        },
        fadeInRight: {
          "0%": { transform: "translate3d(10px,0, 0)", opacity: ".25" },
          "100%": { transform: "translate3d(0, 0, 0)", opacity: "1" },
        },
        fadeInLeft: {
          "0%": { transform: "translate3d(-10px,0, 0)", opacity: ".25" },
          "100%": { transform: "translate3d(0, 0, 0)", opacity: "1" },
        },
        wiggle: {
          "0%, 100%": {
            transform: "translateX(3%)",
          },
          "50%": {
            transform: "translateX(0)",
          },
        },
      },
      lineHeight: {
        12: "3rem",
        14: "3.5rem",
        16: "4rem",
        20: "5rem",
      },
      spacing: {
        r1: "calc(var(--scale) * .25rem)",
        r2: "calc(var(--scale) * .5rem)",
        r3: "calc(var(--scale) * .75rem)",
        r4: "calc(var(--scale) * 1rem)",
        r5: "calc(var(--scale) * 1.25rem)",
        r6: "calc(var(--scale) * 1.5rem)",
        r7: "calc(var(--scale) * 1.75rem)",
        r8: "calc(var(--scale) * 2rem)",
        r9: "calc(var(--scale) * 2.25rem)",
        r10: "calc(var(--scale) * 2.5rem)",
        r11: "calc(var(--scale) * 2.75rem)",
        r12: "calc(var(--scale) * 3rem)",
        r14: "calc(var(--scale) * 3.5rem)",
        r16: "calc(var(--scale) * 4rem)",
        r20: "calc(var(--scale) * 5rem)",
      },
      fontFamily: {
        action: ["var(--font-action)", "Inter", "Georgia", "Times New Roman", "Times", "serif"],
        main: ["var(--font-main)", "Inter", "Arial", "Helvetica Neue", "Helvetica", "sans-serif"],
      },
    },
  },
};
