const fs = require('fs');

const path = "c:/Users/Usuário/Desktop/Oliver/Agência Oliver/Saas Transportadora - Essa é a correta/project/src/components/fuel/FuelModal.tsx";
let content = fs.readFileSync(path, 'utf8');

const uiStart = content.indexOf('          <div>\\n            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Combustível *</label>');
const uiEnd = content.indexOf('          {/* Fuel station with autocomplete */}');

if (uiStart === -1 || uiEnd === -1) {
  console.error("Could not find boundaries");
  process.exit(1);
}

const formContentToReplace = content.substring(uiStart, uiEnd);

const newUI = \`
          {isDriver ? (
            <div className="space-y-6">
              {/* Campos do Motorista */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-4">
                <h4 className="font-bold text-blue-900">1. Combustível</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-1">Litros *</label>
                    <input type="number" value={liters || ""} onChange={(e) => setLiters(parseFloat(e.target.value) || 0)}
                      step="0.001" className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" min="0" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-1">Valor Total (R$) *</label>
                    <input type="number" value={fuelTotalValue || ""} onChange={(e) => setFuelTotalValue(parseFloat(e.target.value) || 0)}
                      step="0.01" className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" min="0" required />
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 space-y-4">
                <h4 className="font-bold text-emerald-900">2. Arla 32 (Opcional)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-emerald-900 mb-1">Litros de Arla</label>
                    <input type="number" value={arlaLiters || ""} onChange={(e) => setArlaLiters(parseFloat(e.target.value) || 0)}
                      step="0.001" className="w-full px-4 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white" min="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-emerald-900 mb-1">Valor Total Arla (R$)</label>
                    <input type="number" value={arlaTotalValue || ""} onChange={(e) => setArlaTotalValue(parseFloat(e.target.value) || 0)}
                      step="0.01" className="w-full px-4 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white" min="0" />
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 space-y-4">
                <h4 className="font-bold text-amber-900">3. Adicionais (Opcional)</h4>
                <p className="text-xs text-amber-700">Perfume, flanela, ou outros itens na mesma nota.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-amber-900 mb-1">Descrição</label>
                    <input type="text" value={additionalItemDesc} onChange={(e) => setAdditionalItemDesc(e.target.value)}
                      placeholder="Ex: Perfume" className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-amber-900 mb-1">Valor (R$)</label>
                    <input type="number" value={additionalItemValue || ""} onChange={(e) => setAdditionalItemValue(parseFloat(e.target.value) || 0)}
                      step="0.01" className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white" min="0" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Combustível *</label>
                <select value={fuelType} onChange={(e) => setFuelType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {Object.entries(FUEL_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Litros *</label>
                  <input type="number" value={liters || ""} onChange={(e) => setLiters(parseFloat(e.target.value) || 0)}
                    step="0.001" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço/Litro (R$) *</label>
                  <input type="number" value={pricePerLiter || ""} onChange={(e) => setPricePerLiter(parseFloat(e.target.value) || 0)}
                    step="0.001" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" required />
                </div>
              </div>

              {fuelType.includes("diesel") && (
                <>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={hasArla} onChange={(e) => setHasArla(e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                    <span className="text-sm font-medium text-blue-900">Adicionou Arla 32?</span>
                  </div>

                  {hasArla && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Litros de Arla *</label>
                        <input type="number" value={arlaLiters || ""} onChange={(e) => setArlaLiters(parseFloat(e.target.value) || 0)}
                          step="0.001" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Preço/Litro Arla (R$) *</label>
                        <input type="number" value={arlaPricePerLiter || ""} onChange={(e) => setArlaPricePerLiter(parseFloat(e.target.value) || 0)}
                          step="0.001" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" required />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={hasDiscount} onChange={(e) => setHasDiscount(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
                <span className="text-sm font-medium text-gray-700">Tem desconto?</span>
              </div>

              {hasDiscount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço com Desconto (R$/L) *</label>
                  <input type="number" value={discountValue || ""} onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    step="0.001" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 border-emerald-300" min="0" />
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                <h4 className="font-bold text-gray-800">Adicionais (Opcional)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                    <input type="text" value={additionalItemDesc} onChange={(e) => setAdditionalItemDesc(e.target.value)}
                      placeholder="Ex: Arla de galão" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                    <input type="number" value={additionalItemValue || ""} onChange={(e) => setAdditionalItemValue(parseFloat(e.target.value) || 0)}
                      step="0.01" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 bg-white" min="0" />
                  </div>
                </div>
              </div>
            </div>
          )}

          `;

content = content.replace(formContentToReplace, newUI);

// Update Total Display
content = content.replace(
  '{totalValue > 0 && (',
  '{displayTotalValue > 0 && ('
);
content = content.replace(
  'R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}',
  'R$ {displayTotalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}'
);

// Add PhotoUpload
content = content.replace(
  '          {error && (',
  \`          <div className="border-t pt-4 mt-4">
            <PhotoUpload
              module="fuel_invoices"
              photos={photos}
              uploading={uploading}
              progress={progress}
              error={uploadError}
              canAddMore={canAddMore}
              maxPhotos={1}
              onUpload={uploadPhoto}
              onRemove={removePhoto}
              label="Foto do Comprovante Fiscal"
            />
          </div>

          {error && (\`
);

fs.writeFileSync(path, content, 'utf8');
console.log("Success");
