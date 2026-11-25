(() => {
  "use strict";

  const VEHICLES = [
    { key: "combustion", label: "Gas", color: "#dc6755" },
    { key: "hybrid", label: "Hybrid", color: "#e5a22f" },
    { key: "electric", label: "EV", color: "#1f9c68" }
  ];

  const DISPLAY_CURRENCIES = {
    EUR: { label: "EUR", rateFromEur: 1 },
    USD: { label: "USD", rateFromEur: 1.08 }
  };

  const DISTANCE_UNITS = {
    km: { label: "km", per100Label: "100 km", factorFromKm: 1, fuelVolume: "l", litresPerFuelUnit: 1 },
    mi: { label: "mi", per100Label: "100 mi", factorFromKm: 0.621371, fuelVolume: "gal", litresPerFuelUnit: 3.78541 }
  };

  const SCENARIO_PRESETS = {
    evFavorable: {
      ownershipYears: 12,
      annualKm: 30000,
      fuelPrice: 2.2,
      homeElectricity: 0.15,
      publicCharging: 0.35,
      homeShare: 90,
      basePrice: 30000,
      hybridPrice: 34000,
      evPrice: 39000,
      insuranceLevel: 95,
      taxLevel: 105,
      evPurchaseIncentive: 4000,
      evRegistrationDiscount: 100,
      evAnnualTaxDiscount: 80,
      evInsuranceDiscount: 8,
      chargerCost: 800,
      resalePreset: "optimistic",
      maintenanceLevel: "low",
      batteryRiskEnabled: false,
      batteryProbability: 6,
      batteryCost: 7000
    },
    balanced: {
      ownershipYears: 10,
      annualKm: 15000,
      fuelPrice: 1.8,
      homeElectricity: 0.2,
      publicCharging: 0.45,
      homeShare: 80,
      basePrice: 30000,
      hybridPrice: 33000,
      evPrice: 38000,
      insuranceLevel: 100,
      taxLevel: 100,
      evPurchaseIncentive: 0,
      evRegistrationDiscount: 0,
      evAnnualTaxDiscount: 0,
      evInsuranceDiscount: 0,
      chargerCost: 1000,
      resalePreset: "balanced",
      maintenanceLevel: "typical",
      batteryRiskEnabled: false,
      batteryProbability: 8,
      batteryCost: 8000
    },
    gasFavorable: {
      ownershipYears: 6,
      annualKm: 7000,
      fuelPrice: 1.35,
      homeElectricity: 0.3,
      publicCharging: 0.75,
      homeShare: 20,
      basePrice: 28000,
      hybridPrice: 35000,
      evPrice: 45000,
      insuranceLevel: 115,
      taxLevel: 85,
      evPurchaseIncentive: 0,
      evRegistrationDiscount: 0,
      evAnnualTaxDiscount: 0,
      evInsuranceDiscount: 0,
      chargerCost: 1800,
      resalePreset: "conservative",
      maintenanceLevel: "high",
      batteryRiskEnabled: true,
      batteryProbability: 14,
      batteryCost: 11000
    }
  };

  const EFFICIENCY = {
    combustionLitresPer100Km: 7.0,
    hybridLitresPer100Km: 5.0,
    electricKWhPer100Km: 18.0
  };

  const MAINTENANCE_COST_PER_KM = {
    combustion: 0.08,
    hybrid: 0.074,
    electric: 0.048
  };

  const ANNUAL_INSURANCE = {
    combustion: 700,
    hybrid: 730,
    electric: 800
  };

  const ANNUAL_TAXES = {
    combustion: 250,
    hybrid: 180,
    electric: 80
  };

  const REGISTRATION_FEES = {
    combustion: 520,
    hybrid: 460,
    electric: 320
  };

  const RESALE_PRESETS = {
    conservative: {
      combustion: { year3: 0.58, year7: 0.31, year12: 0.12 },
      hybrid: { year3: 0.60, year7: 0.33, year12: 0.14 },
      electric: { year3: 0.52, year7: 0.27, year12: 0.10 }
    },
    balanced: {
      combustion: { year3: 0.62, year7: 0.36, year12: 0.18 },
      hybrid: { year3: 0.64, year7: 0.38, year12: 0.20 },
      electric: { year3: 0.58, year7: 0.34, year12: 0.16 }
    },
    optimistic: {
      combustion: { year3: 0.66, year7: 0.41, year12: 0.23 },
      hybrid: { year3: 0.68, year7: 0.44, year12: 0.26 },
      electric: { year3: 0.64, year7: 0.42, year12: 0.24 }
    }
  };

  const MAINTENANCE_LEVELS = {
    low: 0.86,
    typical: 1,
    high: 1.18
  };

  const COMPONENT_META = [
    { key: "upfront", label: "Upfront + registration", color: "#2f7eea" },
    { key: "energy", label: "Energy", color: "#e5a22f" },
    { key: "maintenance", label: "Maintenance + repairs", color: "#119b8f" },
    { key: "fixed", label: "Insurance + taxes", color: "#6d67c8" },
    { key: "policyDiscounts", label: "EV incentives/remissions", color: "#1f9c68", credit: true },
    { key: "battery", label: "Battery risk", color: "#dc6755" },
    { key: "resale", label: "Resale value credit", color: "#1f9c68", credit: true }
  ];

  const LABEL_BY_KEY = VEHICLES.reduce((acc, item) => {
    acc[item.key] = item.label;
    return acc;
  }, {});

  const COLOR_BY_KEY = VEHICLES.reduce((acc, item) => {
    acc[item.key] = item.color;
    return acc;
  }, {});

  const SENTENCE_LABEL_BY_KEY = {
    combustion: "the gas car",
    hybrid: "the hybrid",
    electric: "the EV"
  };

  const TITLE_LABEL_BY_KEY = {
    combustion: "the gas car",
    hybrid: "the hybrid",
    electric: "the EV"
  };

  const $ = (selector) => document.querySelector(selector);

  const ui = {
    widget: $("#carCostWidget"),
    canvas: $("#costChart"),
    heroWinner: $("#heroWinner"),
    heroWinnerNote: $("#heroWinnerNote"),
    selectedYearLabel: $("#selectedYearLabel"),
    selectedYearChip: $("#selectedYearChip"),
    breakdownLead: $("#breakdownLead"),
    breakEvenCard: $("#breakEvenCard"),
    breakEvenNote: $("#breakEvenNote"),
    costPer100Card: $("#costPer100Card"),
    costPer100Note: $("#costPer100Note"),
    driverCard: $("#driverCard"),
    driverNote: $("#driverNote"),
    sensitivityCard: $("#sensitivityCard"),
    sensitivityNote: $("#sensitivityNote"),
    breakdownGrid: $("#breakdownGrid"),
    explanationTitle: $("#explanationTitle"),
    explanationText: $("#explanationText"),
    scenarioButtons: Array.from(document.querySelectorAll("[data-scenario]")),
    controls: {
      displayCurrency: $("#displayCurrency"),
      distanceUnit: $("#distanceUnit"),
      ownershipYears: $("#ownershipYears"),
      annualKm: $("#annualKm"),
      fuelPrice: $("#fuelPrice"),
      homeElectricity: $("#homeElectricity"),
      publicCharging: $("#publicCharging"),
      homeShare: $("#homeShare"),
      basePrice: $("#basePrice"),
      hybridPrice: $("#hybridPrice"),
      evPrice: $("#evPrice"),
      insuranceLevel: $("#insuranceLevel"),
      taxLevel: $("#taxLevel"),
      evPurchaseIncentive: $("#evPurchaseIncentive"),
      evRegistrationDiscount: $("#evRegistrationDiscount"),
      evAnnualTaxDiscount: $("#evAnnualTaxDiscount"),
      evInsuranceDiscount: $("#evInsuranceDiscount"),
      chargerCost: $("#chargerCost"),
      resalePreset: $("#resalePreset"),
      maintenanceLevel: $("#maintenanceLevel"),
      batteryRiskEnabled: $("#batteryRiskEnabled"),
      batteryProbability: $("#batteryProbability"),
      batteryCost: $("#batteryCost")
    },
    outputs: {
      ownershipYears: $("#ownershipYearsValue"),
      annualKm: $("#annualKmValue"),
      fuelPrice: $("#fuelPriceValue"),
      homeElectricity: $("#homeElectricityValue"),
      publicCharging: $("#publicChargingValue"),
      homeShare: $("#homeShareValue"),
      basePrice: $("#basePriceValue"),
      hybridPrice: $("#hybridPriceValue"),
      evPrice: $("#evPriceValue"),
      insuranceLevel: $("#insuranceLevelValue"),
      taxLevel: $("#taxLevelValue"),
      evPurchaseIncentive: $("#evPurchaseIncentiveValue"),
      evRegistrationDiscount: $("#evRegistrationDiscountValue"),
      evAnnualTaxDiscount: $("#evAnnualTaxDiscountValue"),
      evInsuranceDiscount: $("#evInsuranceDiscountValue"),
      chargerCost: $("#chargerCostValue"),
      batteryProbability: $("#batteryProbabilityValue"),
      batteryCost: $("#batteryCostValue")
    }
  };

  let latestModel = null;
  let resizeRaf = 0;
  let heightRaf = 0;
  let lastPostedHeight = 0;
  let activeScenarioKey = "balanced";
  let isApplyingScenario = false;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothstep(t) {
    const x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
  }

  function numberWithCommas(value) {
    return Math.round(value).toLocaleString("en-US");
  }

  function getCurrencyConfig(state) {
    const key = state && state.displayCurrency ? state.displayCurrency : ui.controls.displayCurrency.value;
    return DISPLAY_CURRENCIES[key] || DISPLAY_CURRENCIES.EUR;
  }

  function getDistanceConfig(state) {
    const key = state && state.distanceUnit ? state.distanceUnit : ui.controls.distanceUnit.value;
    return DISTANCE_UNITS[key] || DISTANCE_UNITS.km;
  }

  function convertMoney(value, state) {
    return value * getCurrencyConfig(state).rateFromEur;
  }

  function formatMoney(value) {
    const sign = value < 0 ? "-" : "";
    const currency = getCurrencyConfig();
    return sign + currency.label + " " + numberWithCommas(Math.abs(convertMoney(value)));
  }

  function formatCompactMoney(value) {
    const sign = value < 0 ? "-" : "";
    const currency = getCurrencyConfig();
    const abs = Math.abs(convertMoney(value));
    if (abs >= 1000) {
      return sign + currency.label + " " + (abs / 1000).toFixed(abs >= 100000 ? 0 : 1).replace(/\.0$/, "") + "k";
    }
    return sign + currency.label + " " + Math.round(abs);
  }

  function formatMoneyDecimal(value, decimals) {
    const sign = value < 0 ? "-" : "";
    const currency = getCurrencyConfig();
    return sign + currency.label + " " + formatDecimal(Math.abs(convertMoney(value)), decimals);
  }

  function formatDistance(valueKm, state) {
    const distance = getDistanceConfig(state);
    const value = valueKm * distance.factorFromKm;
    return numberWithCommas(value) + " " + distance.label;
  }

  function displayCostPer100(valuePer100Km, state) {
    const distance = getDistanceConfig(state);
    return convertMoney(valuePer100Km / distance.factorFromKm, state);
  }

  function formatCostPer100(valuePer100Km, state) {
    const distance = getDistanceConfig(state);
    const currency = getCurrencyConfig(state);
    return currency.label + " " + Math.round(displayCostPer100(valuePer100Km, state)) + " / " + distance.per100Label;
  }

  function formatCostPer100Short(valuePer100Km, state) {
    const distance = getDistanceConfig(state);
    return Math.round(displayCostPer100(valuePer100Km, state)) + " / " + distance.per100Label;
  }

  function formatMoneyPer100(valuePer100Km, state) {
    const distance = getDistanceConfig(state);
    const currency = getCurrencyConfig(state);
    return currency.label + " " + Math.round(displayCostPer100(valuePer100Km, state)) + " per " + distance.per100Label;
  }

  function formatEnergyPricePerFuelUnit(valuePerLitre, state) {
    const distance = getDistanceConfig(state);
    return formatMoneyDecimal(valuePerLitre * distance.litresPerFuelUnit, 2) + "/" + distance.fuelVolume;
  }

  function formatDecimal(value, decimals) {
    return Number(value).toFixed(decimals);
  }

  function getRangeNumber(id) {
    return Number(ui.controls[id].value);
  }

  function setActiveScenario(key) {
    activeScenarioKey = key;
    ui.scenarioButtons.forEach((button) => {
      const isActive = key && button.dataset.scenario === key;
      button.classList.toggle("is-active", !!isActive);
      if (isActive) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
  }

  function setControlValue(key, value) {
    const control = ui.controls[key];
    if (!control) return;
    if (control.type === "checkbox") {
      control.checked = !!value;
      return;
    }
    control.value = String(value);
  }

  function applyScenarioPreset(key) {
    const preset = SCENARIO_PRESETS[key];
    if (!preset) return;
    isApplyingScenario = true;
    Object.keys(preset).forEach((controlKey) => {
      setControlValue(controlKey, preset[controlKey]);
    });
    setActiveScenario(key);
    isApplyingScenario = false;
    update();
  }

  function getState() {
    return {
      displayCurrency: ui.controls.displayCurrency.value,
      distanceUnit: ui.controls.distanceUnit.value,
      ownershipYears: getRangeNumber("ownershipYears"),
      annualKm: getRangeNumber("annualKm"),
      fuelPrice: getRangeNumber("fuelPrice"),
      homeElectricity: getRangeNumber("homeElectricity"),
      publicCharging: getRangeNumber("publicCharging"),
      homeShare: getRangeNumber("homeShare") / 100,
      basePrice: getRangeNumber("basePrice"),
      hybridPrice: getRangeNumber("hybridPrice"),
      evPrice: getRangeNumber("evPrice"),
      insuranceLevel: getRangeNumber("insuranceLevel") / 100,
      taxLevel: getRangeNumber("taxLevel") / 100,
      evPurchaseIncentive: getRangeNumber("evPurchaseIncentive"),
      evRegistrationDiscount: getRangeNumber("evRegistrationDiscount") / 100,
      evAnnualTaxDiscount: getRangeNumber("evAnnualTaxDiscount") / 100,
      evInsuranceDiscount: getRangeNumber("evInsuranceDiscount") / 100,
      chargerCost: getRangeNumber("chargerCost"),
      resalePreset: ui.controls.resalePreset.value,
      maintenanceLevel: ui.controls.maintenanceLevel.value,
      batteryRiskEnabled: ui.controls.batteryRiskEnabled.checked,
      batteryProbability: getRangeNumber("batteryProbability") / 100,
      batteryCost: getRangeNumber("batteryCost")
    };
  }

  function pricesFor(state) {
    return {
      combustion: state.basePrice,
      hybrid: state.hybridPrice,
      electric: state.evPrice
    };
  }

  function annualEnergyCost(type, state) {
    if (type === "combustion") {
      return (state.annualKm / 100) * EFFICIENCY.combustionLitresPer100Km * state.fuelPrice;
    }
    if (type === "hybrid") {
      return (state.annualKm / 100) * EFFICIENCY.hybridLitresPer100Km * state.fuelPrice;
    }
    const publicShare = 1 - state.homeShare;
    const blendedPrice = state.homeShare * state.homeElectricity + publicShare * state.publicCharging;
    return (state.annualKm / 100) * EFFICIENCY.electricKWhPer100Km * blendedPrice;
  }

  function repairRiskForYear(type, year, price) {
    const age = Math.max(0, year - 3);
    if (age <= 0) return 0;
    const rates = {
      combustion: 0.0028,
      hybrid: 0.00235,
      electric: 0.00155
    };
    const powers = {
      combustion: 1.18,
      hybrid: 1.16,
      electric: 1.12
    };
    return price * rates[type] * Math.pow(age, powers[type]);
  }

  function cumulativeMaintenanceRepair(type, years, state, price) {
    const level = MAINTENANCE_LEVELS[state.maintenanceLevel] || 1;
    const annualRoutine = state.annualKm * MAINTENANCE_COST_PER_KM[type] * level;
    let total = 0;
    for (let year = 1; year <= years; year += 1) {
      total += annualRoutine + repairRiskForYear(type, year, price);
    }
    return total;
  }

  function residualPercent(type, year, presetName) {
    if (year <= 0) return 1;
    const preset = RESALE_PRESETS[presetName] || RESALE_PRESETS.balanced;
    const p = preset[type];
    const points = [
      { year: 0, value: 1 },
      { year: 3, value: p.year3 },
      { year: 7, value: p.year7 },
      { year: 12, value: p.year12 }
    ];
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const next = points[i];
      if (year <= next.year) {
        const t = (year - prev.year) / (next.year - prev.year);
        return lerp(prev.value, next.value, t);
      }
    }
    return p.year12;
  }

  function batteryRiskCost(type, year, state) {
    if (type !== "electric" || !state.batteryRiskEnabled) return 0;
    const ageWeight = smoothstep((year - 5) / 7);
    return state.batteryProbability * state.batteryCost * ageWeight;
  }

  function calculateVehicleYear(type, year, state, prices) {
    const price = prices[type];
    const registrationBase = REGISTRATION_FEES[type] * state.taxLevel;
    const registrationDiscount = type === "electric" ? registrationBase * state.evRegistrationDiscount : 0;
    const purchaseIncentive = type === "electric" ? state.evPurchaseIncentive : 0;
    const charger = type === "electric" ? state.chargerCost : 0;
    const grossUpfront = price + registrationBase + charger;
    const upfrontPolicyDiscounts = registrationDiscount + purchaseIncentive;
    const netUpfront = Math.max(0, grossUpfront - upfrontPolicyDiscounts);
    const energy = annualEnergyCost(type, state) * year;
    const maintenance = cumulativeMaintenanceRepair(type, year, state, price);
    const annualInsuranceBase = ANNUAL_INSURANCE[type] * state.insuranceLevel;
    const annualTaxBase = ANNUAL_TAXES[type] * state.taxLevel;
    const insuranceDiscount = type === "electric" ? annualInsuranceBase * state.evInsuranceDiscount : 0;
    const annualTaxDiscount = type === "electric" ? annualTaxBase * state.evAnnualTaxDiscount : 0;
    const fixedGross = (annualInsuranceBase + annualTaxBase) * year;
    const recurringPolicyDiscounts = (insuranceDiscount + annualTaxDiscount) * year;
    const fixed = Math.max(0, fixedGross - recurringPolicyDiscounts);
    const policyDiscounts = upfrontPolicyDiscounts + recurringPolicyDiscounts;
    const battery = batteryRiskCost(type, year, state);
    const resale = price * residualPercent(type, year, state.resalePreset);
    const total = grossUpfront + energy + maintenance + fixedGross + battery - policyDiscounts - resale;

    return {
      type,
      year,
      price,
      grossUpfront,
      netUpfront,
      energy,
      maintenance,
      fixedGross,
      fixed,
      policyDiscounts,
      battery,
      resale,
      total,
      costPer100: year > 0 ? total / ((state.annualKm * year) / 100) : 0,
      energyPer100: annualEnergyCost(type, state) / (state.annualKm / 100)
    };
  }

  function buildModel(state) {
    const prices = pricesFor(state);
    const series = {};
    VEHICLES.forEach((vehicle) => {
      series[vehicle.key] = [];
      for (let year = 0; year <= 12; year += 1) {
        series[vehicle.key].push(calculateVehicleYear(vehicle.key, year, state, prices));
      }
    });

    const selectedYear = state.ownershipYears;
    const selected = VEHICLES.map((vehicle) => series[vehicle.key][selectedYear]);
    const winner = selected.slice().sort((a, b) => a.total - b.total)[0];
    const breakEvenYear = findBreakEven(series.electric, series.combustion);
    const biggestDriver = findBiggestDriver(winner);
    const sensitivity = classifySensitivity(state);

    return {
      state,
      prices,
      series,
      selectedYear,
      selected,
      winner,
      breakEvenYear,
      biggestDriver,
      sensitivity
    };
  }

  function findBreakEven(targetSeries, baselineSeries) {
    for (let year = 1; year <= 12; year += 1) {
      if (targetSeries[year].total <= baselineSeries[year].total) {
        return year;
      }
    }
    return null;
  }

  function findBiggestDriver(result) {
    const drivers = [
      { label: "Depreciation", value: Math.max(0, result.netUpfront - result.resale) },
      { label: "Energy", value: result.energy },
      { label: "Maintenance", value: result.maintenance },
      { label: "Insurance/taxes", value: result.fixed },
      { label: "Battery risk", value: result.battery }
    ];
    return drivers.sort((a, b) => b.value - a.value)[0];
  }

  function classifySensitivity(state) {
    const publicShare = 1 - state.homeShare;
    if ((publicShare >= 0.5 && state.publicCharging >= 0.5) || (state.annualKm <= 9000 && state.evPrice - state.basePrice >= 7000)) {
      return {
        level: "High",
        note: "EV outcome is sensitive to public charging, low mileage, or purchase price."
      };
    }
    if (state.homeShare >= 0.75 && state.homeElectricity <= 0.25 && state.annualKm >= 16000) {
      return {
        level: "Lower",
        note: "Home charging and higher mileage make EV running savings easier to see."
      };
    }
    return {
      level: "Moderate",
      note: "Charging mix, mileage, and resale assumptions can still change the ranking."
    };
  }

  function syncOutputLabels(state) {
    ui.outputs.ownershipYears.textContent = state.ownershipYears + (state.ownershipYears === 1 ? " year" : " years");
    ui.outputs.annualKm.textContent = formatDistance(state.annualKm, state);
    ui.outputs.fuelPrice.textContent = formatEnergyPricePerFuelUnit(state.fuelPrice, state);
    ui.outputs.homeElectricity.textContent = formatMoneyDecimal(state.homeElectricity, 2) + "/kWh";
    ui.outputs.publicCharging.textContent = formatMoneyDecimal(state.publicCharging, 2) + "/kWh";
    ui.outputs.homeShare.textContent = Math.round(state.homeShare * 100) + "%";
    ui.outputs.basePrice.textContent = formatMoney(state.basePrice);
    ui.outputs.hybridPrice.textContent = formatMoney(state.hybridPrice);
    ui.outputs.evPrice.textContent = formatMoney(state.evPrice);
    ui.outputs.insuranceLevel.textContent = levelLabel(Math.round(state.insuranceLevel * 100));
    ui.outputs.taxLevel.textContent = levelLabel(Math.round(state.taxLevel * 100));
    ui.outputs.evPurchaseIncentive.textContent = formatMoney(state.evPurchaseIncentive);
    ui.outputs.evRegistrationDiscount.textContent = Math.round(state.evRegistrationDiscount * 100) + "%";
    ui.outputs.evAnnualTaxDiscount.textContent = Math.round(state.evAnnualTaxDiscount * 100) + "%";
    ui.outputs.evInsuranceDiscount.textContent = Math.round(state.evInsuranceDiscount * 100) + "%";
    ui.outputs.chargerCost.textContent = formatMoney(state.chargerCost);
    ui.outputs.batteryProbability.textContent = Math.round(state.batteryProbability * 100) + "%";
    ui.outputs.batteryCost.textContent = formatMoney(state.batteryCost);

    Object.keys(ui.controls).forEach((key) => {
      const control = ui.controls[key];
      if (control && control.type === "range") {
        const min = Number(control.min);
        const max = Number(control.max);
        const value = Number(control.value);
        const fill = ((value - min) / (max - min)) * 100;
        control.style.setProperty("--fill", clamp(fill, 0, 100).toFixed(1) + "%");
      }
    });

    const batteryDisabled = !state.batteryRiskEnabled;
    ui.controls.batteryProbability.disabled = batteryDisabled;
    ui.controls.batteryCost.disabled = batteryDisabled;
    document.querySelectorAll(".battery-control").forEach((control) => {
      control.style.opacity = batteryDisabled ? "0.48" : "1";
    });
  }

  function levelLabel(percent) {
    if (percent < 85) return "Low";
    if (percent > 115) return "High";
    return "Typical";
  }

  function updateUI(model) {
    const winnerLabel = LABEL_BY_KEY[model.winner.type];
    ui.heroWinner.textContent = winnerLabel;
    ui.heroWinnerNote.textContent = "At year " + model.selectedYear + " under current assumptions";
    ui.selectedYearLabel.textContent = String(model.selectedYear);
    ui.selectedYearChip.textContent = model.selectedYear + (model.selectedYear === 1 ? " year" : " years");
    ui.breakdownLead.textContent = winnerLabel + " is lowest in this snapshot. Bars show the cost blocks and credits behind the total.";

    if (model.breakEvenYear) {
      ui.breakEvenCard.textContent = "Year " + model.breakEvenYear;
      ui.breakEvenNote.textContent = "EV becomes cheaper than the gas car within 12 years.";
    } else {
      ui.breakEvenCard.textContent = "No break-even";
      ui.breakEvenNote.textContent = "EV does not become cheaper than the gas car within 12 years.";
    }

    ui.costPer100Card.textContent = formatCostPer100(model.winner.costPer100, model.state);
    ui.costPer100Note.textContent = winnerLabel + " average over " + model.selectedYear + " years.";
    ui.driverCard.textContent = model.biggestDriver.label;
    ui.driverNote.textContent = "Largest component for the selected-year winner.";
    ui.sensitivityCard.textContent = model.sensitivity.level;
    ui.sensitivityNote.textContent = model.sensitivity.note;

    renderBreakdown(model);
    ui.explanationTitle.textContent = "Why " + TITLE_LABEL_BY_KEY[model.winner.type] + " is ahead";
    ui.explanationText.textContent = buildExplanation(model);
  }

  function renderBreakdown(model) {
    const maxComponent = Math.max(
      1,
      ...model.selected.flatMap((result) => [
        result.grossUpfront,
        result.energy,
        result.maintenance,
        result.fixedGross,
        result.policyDiscounts,
        result.battery,
        result.resale
      ])
    );

    ui.breakdownGrid.innerHTML = model.selected.map((result) => {
      const components = {
        upfront: result.grossUpfront,
        energy: result.energy,
        maintenance: result.maintenance,
        fixed: result.fixedGross,
        policyDiscounts: result.policyDiscounts,
        battery: result.battery,
        resale: result.resale
      };

      const rows = COMPONENT_META.map((meta) => {
        if (meta.key === "battery" && !model.state.batteryRiskEnabled) return "";
        if (meta.key === "policyDiscounts" && valueIsZero(components[meta.key])) return "";
        const value = components[meta.key];
        const width = clamp((value / maxComponent) * 100, 0, 100);
        const displayValue = meta.credit ? "-" + formatMoney(value) : formatMoney(value);
        const rowClass = meta.credit ? " component-row--credit" : "";
        return (
          '<div class="component-row' + rowClass + '">' +
            '<div class="component-top">' +
              '<span class="component-label">' + meta.label + '</span>' +
              '<span class="component-value">' + displayValue + '</span>' +
            '</div>' +
            '<div class="component-bar" style="--bar-color:' + meta.color + '">' +
              '<span style="--bar:' + width.toFixed(1) + '%"></span>' +
            '</div>' +
          '</div>'
        );
      }).join("");

      return (
        '<article class="breakdown-card">' +
          '<div class="breakdown-card__head">' +
            '<div>' +
              '<span class="breakdown-card__type">' + LABEL_BY_KEY[result.type] + '</span>' +
              '<strong style="color:' + COLOR_BY_KEY[result.type] + '">' + formatMoney(result.total) + '</strong>' +
            '</div>' +
            '<div class="breakdown-card__total">' + formatCostPer100Short(result.costPer100, model.state) + '</div>' +
          '</div>' +
          '<div class="component-list">' + rows + '</div>' +
        '</article>'
      );
    }).join("");
  }

  function buildExplanation(model) {
    const state = model.state;
    const electric = model.series.electric[model.selectedYear];
    const combustion = model.series.combustion[model.selectedYear];
    const evPriceGap = model.prices.electric - model.prices.combustion;
    const hybridPriceGap = model.prices.hybrid - model.prices.combustion;
    const energyGap = combustion.energyPer100 - electric.energyPer100;
    const winner = SENTENCE_LABEL_BY_KEY[model.winner.type];
    const periodLabel = model.selectedYear + (model.selectedYear === 1 ? " year" : " years");
    const parts = [];

    parts.push(
      "After " + periodLabel + ", " + winner +
      " is lowest once upfront cost, running costs, depreciation, taxes, insurance, and resale are counted."
    );

    if (model.winner.type === "electric" && evPriceGap > 0 && energyGap > 0) {
      parts.push(
        "Its " + formatMoney(evPriceGap) + " higher purchase price versus gas is offset by lower maintenance and energy costs; energy is about " +
        formatMoneyPer100(energyGap, state) + " cheaper."
      );
    } else if (model.winner.type === "electric" && evPriceGap > 0) {
      parts.push(
        "Its " + formatMoney(evPriceGap) + " higher purchase price versus gas is offset by lower energy and maintenance costs."
      );
    } else if (model.winner.type === "hybrid") {
      if (hybridPriceGap > 0) {
        parts.push("Hybrid wins by lowering fuel use while keeping the price gap versus gas to " + formatMoney(hybridPriceGap) + ".");
      } else {
        parts.push("Hybrid wins by lowering fuel use without a higher purchase price than gas in this scenario.");
      }
    } else if (model.winner.type === "combustion") {
      parts.push("The gas car stays ahead because the lower purchase price is not overtaken by running-cost savings.");
    }

    if (model.winner.type === "electric" && energyGap > 0 && evPriceGap <= 0) {
      parts.push(
        "Energy is roughly " + formatMoneyPer100(energyGap, state) + " cheaper than gas car fuel at this charging mix."
      );
    } else if (model.winner.type === "electric" && energyGap <= 0) {
      parts.push(
        "The energy advantage is modest here, so resale and upfront assumptions carry more weight."
      );
    }

    if (electric.policyDiscounts > 0) {
      parts.push(
        "EV incentives and remissions remove about " + formatMoney(electric.policyDiscounts) + " from the selected-year EV cost."
      );
    }

    if (model.winner.type === "electric" && model.breakEvenYear) {
      parts.push("It passes the gas car around year " + model.breakEvenYear + ".");
    } else if (model.winner.type !== "electric" && !model.breakEvenYear) {
      parts.push("The EV does not pass the gas car within 12 years in this setup.");
    }

    if (state.annualKm < 10000) {
      parts.push("Low annual distance makes running-cost savings build slowly.");
    } else if (state.annualKm > 22000) {
      parts.push("High annual distance makes energy and maintenance differences more visible.");
    }

    if (state.homeShare < 0.5) {
      parts.push("Public charging exposure makes the EV result more sensitive.");
    } else if (state.homeShare >= 0.75) {
      parts.push("Mostly home charging helps the EV case.");
    }

    if (state.batteryRiskEnabled) {
      parts.push("Battery replacement is treated as expected risk, not a certainty.");
    }

    return parts.join(" ");
  }

  function valueIsZero(value) {
    return Math.abs(value || 0) < 0.5;
  }

  function drawChart(model) {
    const canvas = ui.canvas;
    const frame = canvas.parentElement;
    const frameStyles = window.getComputedStyle(frame);
    const framePaddingX = (parseFloat(frameStyles.paddingLeft) || 0) + (parseFloat(frameStyles.paddingRight) || 0);
    const width = Math.max(320, Math.round(canvas.clientWidth || frame.clientWidth - framePaddingX || 410));
    const height = Math.max(300, Math.round(canvas.clientHeight || 410));
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const compact = width < 560;
    const margin = {
      left: compact ? 54 : 70,
      right: compact ? 14 : 34,
      top: compact ? 24 : 28,
      bottom: compact ? 42 : 50
    };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;
    const allTotals = VEHICLES.flatMap((vehicle) => model.series[vehicle.key].map((point) => point.total));
    const rawMax = Math.max(...allTotals, 1);
    const yMax = Math.ceil(rawMax / 5000) * 5000;
    const mapX = (year) => margin.left + (year / 12) * plotW;
    const mapY = (value) => margin.top + plotH - (value / yMax) * plotH;

    ctx.fillStyle = "#fbfdff";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(45,73,90,.14)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#607385";
    ctx.font = "700 11px Inter, Segoe UI, Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    const yTicks = 5;
    for (let i = 0; i <= yTicks; i += 1) {
      const value = (yMax / yTicks) * i;
      const y = mapY(value);
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
      ctx.fillText(formatCompactMoney(value), margin.left - 9, y);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    [0, 3, 7, 12].forEach((year) => {
      const x = mapX(year);
      ctx.strokeStyle = "rgba(45,73,90,.11)";
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, height - margin.bottom);
      ctx.stroke();
      ctx.fillStyle = "#607385";
      ctx.fillText("Y" + year, x, height - margin.bottom + 14);
    });

    const selectedX = mapX(model.selectedYear);
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "rgba(21,95,194,.42)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(selectedX, margin.top - 4);
    ctx.lineTo(selectedX, height - margin.bottom + 4);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#155fc2";
    ctx.font = "850 11px Inter, Segoe UI, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("Selected year " + model.selectedYear, selectedX, margin.top - 8);

    VEHICLES.forEach((vehicle) => {
      const points = model.series[vehicle.key];
      ctx.strokeStyle = vehicle.color;
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      points.forEach((point, index) => {
        const x = mapX(point.year);
        const y = mapY(point.total);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      const selected = points[model.selectedYear];
      const sx = mapX(model.selectedYear);
      const sy = mapY(selected.total);
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = vehicle.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    drawSelectedLabels(ctx, model, mapX, mapY, width, height, margin);

    ctx.strokeStyle = "rgba(45,73,90,.28)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.stroke();
  }

  function drawSelectedLabels(ctx, model, mapX, mapY, width, height, margin) {
    const labels = VEHICLES.map((vehicle) => {
      const result = model.series[vehicle.key][model.selectedYear];
      return {
        vehicle,
        result,
        x: mapX(model.selectedYear),
        y: mapY(result.total)
      };
    }).sort((a, b) => a.y - b.y);

    let previousY = -Infinity;
    labels.forEach((item) => {
      item.labelY = Math.max(item.y, previousY + 25);
      item.labelY = Math.min(item.labelY, height - margin.bottom - 14);
      previousY = item.labelY;
    });

    labels.forEach((item) => {
      const text = item.vehicle.label + " " + formatCompactMoney(item.result.total);
      ctx.font = "850 11px Inter, Segoe UI, Arial, sans-serif";
      const textWidth = ctx.measureText(text).width;
      const boxW = textWidth + 16;
      const boxH = 22;
      const preferredRight = item.x < width * 0.62;
      let bx = preferredRight ? item.x + 12 : item.x - boxW - 12;
      bx = clamp(bx, margin.left + 6, width - margin.right - boxW - 2);
      const by = item.labelY - boxH / 2;

      ctx.strokeStyle = item.vehicle.color;
      ctx.fillStyle = "rgba(255,255,255,.94)";
      roundedRect(ctx, bx, by, boxW, boxH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = item.vehicle.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(item.x, item.y);
      ctx.lineTo(bx + (preferredRight ? 0 : boxW), item.labelY);
      ctx.stroke();

      ctx.fillStyle = "#122433";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(text, bx + 8, item.labelY + 0.5);
    });
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function update() {
    const state = getState();
    syncOutputLabels(state);
    latestModel = buildModel(state);
    updateUI(latestModel);
    drawChart(latestModel);
    scheduleHeightReport(true);
  }

  function scheduleChartResize() {
    if (resizeRaf) return;
    resizeRaf = window.requestAnimationFrame(() => {
      resizeRaf = 0;
      if (latestModel) drawChart(latestModel);
      scheduleHeightReport(true);
    });
  }

  function measureHeight() {
    const root = document.querySelector(".sf-shell") || document.body;
    const rect = root.getBoundingClientRect();
    const styles = window.getComputedStyle(root);
    const marginTop = parseFloat(styles.marginTop) || 0;
    const marginBottom = parseFloat(styles.marginBottom) || 0;
    const doc = document.documentElement;
    const body = document.body;
    const bodyRect = body ? body.getBoundingClientRect() : { height: 0 };
    return Math.ceil(Math.max(
      rect.height + marginTop + marginBottom,
      bodyRect.height,
      doc ? doc.scrollHeight : 0,
      doc ? doc.offsetHeight : 0,
      doc ? doc.clientHeight : 0,
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0,
      body ? body.clientHeight : 0,
      1
    ));
  }

  function scheduleHeightReport(force) {
    if (heightRaf) return;
    heightRaf = window.requestAnimationFrame(() => {
      heightRaf = 0;
      const height = measureHeight();
      if (!force && Math.abs(height - lastPostedHeight) < 1) return;
      lastPostedHeight = height;

      if (window.parent && window.parent !== window) {
        try {
          if (window.frameElement) {
            window.frameElement.style.height = height + "px";
            window.frameElement.setAttribute("height", String(height));
          }
        } catch (_error) {}

        try {
          window.parent.postMessage({ type: "simfluence-widget:resize", height }, "*");
          window.parent.postMessage({ type: "widget:resize", height }, "*");
          window.parent.postMessage(
            {
              type: "simfluence-widget:resize",
              widget: "car-ownership-cost-simulator",
              height
            },
            "*"
          );
        } catch (_error) {}
      }
    });
  }

  function bindControls() {
    Object.keys(ui.controls).forEach((key) => {
      const control = ui.controls[key];
      const eventName = control.type === "checkbox" || control.tagName === "SELECT" ? "change" : "input";
      control.addEventListener(eventName, () => {
        if (!isApplyingScenario && key !== "displayCurrency" && key !== "distanceUnit") {
          setActiveScenario(null);
        }
        update();
      });
    });

    ui.scenarioButtons.forEach((button) => {
      button.addEventListener("click", () => {
        applyScenarioPreset(button.dataset.scenario);
      });
    });

    window.addEventListener("resize", scheduleChartResize, { passive: true });
    window.addEventListener("load", () => scheduleHeightReport(true), { once: true });
    window.addEventListener("pageshow", () => scheduleHeightReport(true));
    window.addEventListener("message", (event) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (
        data.type === "widget:request-height" ||
        data.type === "widget:request-resize" ||
        data.type === "simfluence-widget:request-height" ||
        data.type === "simfluence-widget:request-resize"
      ) {
        scheduleHeightReport(true);
      }
    });

    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(scheduleChartResize);
      observer.observe(ui.canvas.parentElement);
      observer.observe(ui.widget);
    }

    if ("MutationObserver" in window) {
      const observer = new MutationObserver(() => scheduleHeightReport(true));
      observer.observe(ui.widget, {
        attributes: true,
        childList: true,
        subtree: true
      });
    }
  }

  if (window.parent !== window) {
    document.documentElement.classList.add("embed-mode");
    document.body.classList.add("embed-mode");
  }

  bindControls();
  setActiveScenario(activeScenarioKey);
  update();
  window.setTimeout(() => scheduleHeightReport(true), 80);
  window.setTimeout(() => scheduleHeightReport(true), 400);
  window.setTimeout(() => scheduleHeightReport(true), 1200);
  window.setTimeout(() => scheduleHeightReport(true), 2200);
  window.setTimeout(() => scheduleHeightReport(true), 3600);
  window.setTimeout(() => scheduleHeightReport(true), 5200);
  window.setTimeout(() => scheduleHeightReport(true), 8000);
  if (document.fonts && typeof document.fonts.ready?.then === "function") {
    document.fonts.ready.then(() => scheduleHeightReport(true)).catch(() => {});
  }
})();
