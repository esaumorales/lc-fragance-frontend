# Fotos de la vitrina

La vitrina muestra seis productos de demostración con once vistas cada uno:
frontal, cuatro pasos intermedios por lado (`08`, `12`, `16` y `20` grados)
y los extremos laterales (`-left.webp`, `-right.webp`). Son 66 imágenes en total.
Las vistas adicionales se generaron con ángulos aproximados de 8°, 12°, 16°,
20° y 25° a partir de las fotos de referencia,
conservando el frasco y su etiqueta sobre fondo transparente.
Son aproximaciones visuales creadas con IA, no fotografías oficiales ni una
representación exacta de la parte posterior del envase. Verifica cada producto
con el inventario real antes de publicarlo.

Las referencias utilizadas fueron fotos de producto de
[Afnan 9 AM Dive](https://nacosofficial.com/products/afnan-9am-drive-100ml),
[Afnan 9 PM Elixir](https://houseofniche.nl/products/afnan-9-pm-elixir-extrait-de-parfum-100-ml),
[Armaf Odyssey Homme](https://makeupstore.co.il/en/product/485844/),
[Armaf Odyssey Mandarin Sky Elixir](https://priveperfumes.com/en/products/perfume-armaf-odyssey-mandarin-sky-elixir-edp-m-100-ml),
[Lattafa Asad con spray](https://comprarenchile.cl/products/lattafa-asad-set) y
[Asad Bourbon + Elixir](https://www.walmart.com.mx/ip/set-de-perfumes-lattafa-asad-elixir-bourbon-edp-100-ml/00629036234188).

Para cambiar un producto, reemplaza sus once vistas conservando los nombres o
modifica `src/data/perfumes-vitrina.ts`. Mantén el fondo transparente y el mismo
encuadre y escala en todas las imágenes: el desplazamiento muestra el
fotograma más cercano al ángulo mientras el perfume recorre el arco. Las luces y sombras
las aporta la página.
