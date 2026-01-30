import localFont from "next/font/local";


export const venom = localFont({
  src: [
    {
      path: "../public/fonts/Matamoros.ttf",
      weight: '400',
      style: 'normal',
    }
  ],
  variable: "--font-venom",
  display: "swap",
});

export const mayak = localFont({
  src: [
    {
      path: "../public/fonts/Mayak.ttf",
      weight: '400',
      style: 'normal',
    }
  ],
  variable: "--font-mayak",
  display: "swap",
});

export const oskariG2 = localFont({
  src: [
    {
      path: "../public/fonts/OskariG2.otf",
      weight: '400',
      style: 'normal',
    }
  ],
  variable: "--font-oskarig2",
  display: "swap",
});