export const demoCompany1 = {
  name: "Bródka Demo",
  countryCode: "PL",
  baseCurrency: "EUR",
  farm: {
    name: "Bródka Central",
    city: "Bródka",
    lat: "52.20000",
    lng: "21.11667",
    capacity: 42000,
  },
  houses: [
    { name: "Brooder A", houseType: "brooder" as const },
    { name: "Grower B", houseType: "finisher" as const },
    { name: "Finisher C", houseType: "finisher" as const },
  ],
};
