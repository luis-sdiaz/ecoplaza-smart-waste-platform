function SettingsPanel() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <article className="rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6">
        <h2 className="text-base font-semibold text-ecoplaza-text">
          Preferencias generales
        </h2>

        <p className="mt-1 text-sm text-ecoplaza-text-muted">
          Configura las preferencias principales de EcoPlaza.
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="language"
              className="block text-sm font-medium text-ecoplaza-text"
            >
              Idioma de la interfaz
            </label>

            <select
              id="language"
              defaultValue="es"
              className="mt-2 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-4 py-3 text-sm text-ecoplaza-text outline-none"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="weight-unit"
              className="block text-sm font-medium text-ecoplaza-text"
            >
              Unidad de peso
            </label>

            <select
              id="weight-unit"
              defaultValue="kg"
              className="mt-2 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-4 py-3 text-sm text-ecoplaza-text outline-none"
            >
              <option value="kg">Kilogramos (kg)</option>
            </select>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-ecoplaza-border bg-ecoplaza-surface p-6">
        <h2 className="text-base font-semibold text-ecoplaza-text">
          Contenedor de demostración
        </h2>

        <p className="mt-1 text-sm text-ecoplaza-text-muted">
          Define la categoría que representará el contenedor físico.
        </p>

        <div className="mt-6">
          <label
            htmlFor="demo-category"
            className="block text-sm font-medium text-ecoplaza-text"
          >
            Categoría asignada
          </label>

          <select
            id="demo-category"
            defaultValue="organic"
            className="mt-2 w-full rounded-xl border border-ecoplaza-border bg-ecoplaza-background px-4 py-3 text-sm text-ecoplaza-text outline-none"
          >
            <option value="organic">Residuos orgánicos</option>
            <option value="recyclable">Residuos reciclables</option>
            <option value="non-recyclable">Residuos no aprovechables</option>
          </select>

          <p className="mt-3 text-xs leading-5 text-ecoplaza-text-muted">
            Esta configuración permitirá usar el mismo contenedor físico para
            demostrar las tres categorías gestionadas por EcoPlaza.
          </p>
        </div>
      </article>
    </div>
  );
}

export default SettingsPanel;
