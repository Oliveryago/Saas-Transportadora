const fs = require('fs');

const path = "c:/Users/Usuário/Desktop/Oliver/Agência Oliver/Saas Transportadora - Essa é a correta/project/src/components/fuel/FuelModal.tsx";
let content = fs.readFileSync(path, 'utf8');

// 1. Add imports
content = content.replace(
  'import { getLocalDateString } from "../../lib/utils/date";',
  `import { getLocalDateString } from "../../lib/utils/date";\nimport { useAuth } from "../../contexts/AuthContext";\nimport { PhotoUpload } from "../shared/PhotoUpload";\nimport { usePhotoUpload } from "../../hooks/usePhotoUpload";`
);

// 2. Add useAuth and usePhotoUpload
content = content.replace(
  '  const { suppliers } = useSuppliers();',
  `  const { suppliers } = useSuppliers();\n  const { user } = useAuth();\n  const isDriver = user?.role === "driver";\n\n  const {\n    photos,\n    uploading,\n    progress,\n    error: uploadError,\n    uploadPhoto,\n    removePhoto,\n    clearPhotos,\n    loadExistingPhotos,\n    canAddMore\n  } = usePhotoUpload({ module: "fuel_invoices", maxPhotos: 1 });`
);

// 3. Add new states
content = content.replace(
  '  const [isFullTank, setIsFullTank] = useState(true);',
  `  const [isFullTank, setIsFullTank] = useState(true);\n  const [fuelTotalValue, setFuelTotalValue] = useState(0);\n  const [arlaTotalValue, setArlaTotalValue] = useState(0);\n  const [additionalItemDesc, setAdditionalItemDesc] = useState("");\n  const [additionalItemValue, setAdditionalItemValue] = useState(0);`
);

// 4. Update useEffect for editingRecord
content = content.replace(
  '      setIsFullTank(editingRecord.is_full_tank ?? true);\n    } else {',
  `      setIsFullTank(editingRecord.is_full_tank ?? true);\n      setAdditionalItemDesc(editingRecord.additional_item_description || "");\n      setAdditionalItemValue(editingRecord.additional_item_value || 0);\n      if (editingRecord.invoice_photo_url) {\n        loadExistingPhotos([editingRecord.invoice_photo_url]);\n      } else {\n        clearPhotos();\n      }\n      \n      if (editingRecord.value_brl) {\n        setFuelTotalValue(editingRecord.liters * (editingRecord.price_per_liter || 0));\n        setArlaTotalValue((editingRecord.arla_liters || 0) * (editingRecord.arla_price_per_liter || 0));\n      }\n    } else {`
);

content = content.replace(
  '      setIsFullTank(true);\n    }',
  `      setIsFullTank(true);\n      setAdditionalItemDesc("");\n      setAdditionalItemValue(0);\n      setFuelTotalValue(0);\n      setArlaTotalValue(0);\n      clearPhotos();\n    }`
);

// 5. Update logic for values
content = content.replace(
  '  const effectivePrice = hasDiscount && discountValue > 0 ? discountValue : pricePerLiter;\n  const dieselValue = liters > 0 && effectivePrice > 0 ? liters * effectivePrice : 0;\n  const arlaValue = hasArla && arlaLiters > 0 && arlaPricePerLiter > 0 ? arlaLiters * arlaPricePerLiter : 0;\n  const totalValue = dieselValue + arlaValue;',
  `  const effectivePrice = hasDiscount && discountValue > 0 ? discountValue : pricePerLiter;\n  const dieselValue = liters > 0 && effectivePrice > 0 ? liters * effectivePrice : 0;\n  const adminArlaValue = hasArla && arlaLiters > 0 && arlaPricePerLiter > 0 ? arlaLiters * arlaPricePerLiter : 0;\n  \n  let finalValueBrl = 0;\n  let finalPricePerLiter = pricePerLiter;\n  let finalArlaPricePerLiter = arlaPricePerLiter;\n\n  if (isDriver) {\n    finalValueBrl = fuelTotalValue + arlaTotalValue + additionalItemValue;\n    finalPricePerLiter = liters > 0 ? fuelTotalValue / liters : 0;\n    finalArlaPricePerLiter = arlaLiters > 0 ? arlaTotalValue / arlaLiters : 0;\n  } else {\n    finalValueBrl = dieselValue + adminArlaValue + additionalItemValue;\n  }\n  const displayTotalValue = finalValueBrl;`
);

// 6. Update handleSubmit validations
content = content.replace(
  '    if (pricePerLiter <= 0) { setError("Informe o preço por litro"); return; }',
  `    if (!isDriver && pricePerLiter <= 0) { setError("Informe o preço por litro"); return; }\n    if (isDriver && fuelTotalValue <= 0) { setError("Informe o valor total do combustível"); return; }`
);

// 7. Update dataToSave
content = content.replace(
  '        price_per_liter: pricePerLiter,',
  `        price_per_liter: finalPricePerLiter,`
);
content = content.replace(
  '        arla_price_per_liter: hasArla ? arlaPricePerLiter : undefined,',
  `        arla_price_per_liter: (hasArla || (isDriver && arlaLiters > 0)) ? finalArlaPricePerLiter : undefined,\n        additional_item_description: additionalItemDesc,\n        additional_item_value: additionalItemValue,\n        invoice_photo_url: photos.length > 0 ? photos[0].url : undefined,`
);
content = content.replace(
  '        value_brl: totalValue,',
  `        value_brl: finalValueBrl,`
);

// Update Total Value Display at the bottom
content = content.replace(
  '          {totalValue > 0 && (',
  `          {displayTotalValue > 0 && (`
);

content = content.replace(
  '                  R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}',
  `                  R$ {displayTotalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
);

// Replace the form fields part
const startIdx = content.indexOf('          <div>\\n            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Combustível *</label>');
const endIdx = content.indexOf('{/* Fuel station with autocomplete */}');

if (startIdx > -1 && endIdx > -1) {
  // Found them manually via script
}

fs.writeFileSync('rewrite_fuel_modal_part1.js', 'console.log("ready")');
