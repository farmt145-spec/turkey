export const demoCompany2 = {
  name: "Farma Trójna",
  countryCode: "PL",
  baseCurrency: "EUR",
  farm: {
    name: "Trójna Południe",
    city: "Trójna",
    lat: "52.08000",
    lng: "20.98000",
    capacity: 46000,
  },
  houses: [
    { name: "Brooder Alpha", houseType: "brooder" as const },
    { name: "Grower Beta", houseType: "finisher" as const },
    { name: "Finisher Gamma", houseType: "finisher" as const },
  ],
};
