// Telas de iPhone cobertas pela splash screen do app instalado (ver
// app/layout.js e scripts/gerar-splash-ios.mjs). Por tamanho CSS + densidade
// de pixel, não por nome de modelo — várias gerações de iPhone compartilham
// a mesma tela física. Só telas em uso hoje (2020 em diante).
export const SPLASH_IOS = [
  { nome: '440x956', cssW: 440, cssH: 956, dpr: 3 }, // 16 Pro Max
  { nome: '430x932', cssW: 430, cssH: 932, dpr: 3 }, // 15 Plus, 15 Pro Max, 16 Plus
  { nome: '428x926', cssW: 428, cssH: 926, dpr: 3 }, // 12 Pro Max, 13 Pro Max, 14 Plus
  { nome: '402x874', cssW: 402, cssH: 874, dpr: 3 }, // 16 Pro
  { nome: '393x852', cssW: 393, cssH: 852, dpr: 3 }, // 14 Pro, 15, 15 Pro, 16
  { nome: '390x844', cssW: 390, cssH: 844, dpr: 3 }, // 12, 12 Pro, 13, 13 Pro, 14
  { nome: '375x812', cssW: 375, cssH: 812, dpr: 3 }, // 12 mini, 13 mini
  { nome: '375x667', cssW: 375, cssH: 667, dpr: 2 }, // SE (2ª/3ª geração)
];
