// Photo behind each category tile in the filter bar (free-licence Unsplash
// photos, picked to be bright and on-subject). Categories without one show a
// plain teal tile.
const PHOTO: Record<string, string> = {
  live_music: "1540039155733-5bb30b53aa14",
  dj_performance: "1470225620780-dba8ba36b745",
  theater: "1514306191717-452ec28c7814",
  sports: "1522778119026-d647f0596c20",
  food_drink: "1626628577177-7c9a3a907d5a",
  family_kids: "1504196606672-aef5c9cefc92",
  arts_culture: "1513364776144-60967b0f800f",
  festivals: "1569930784237-ea65a2f40a83",
  exhibitions: "1738391788925-d130a4993d50",
  conferences: "1773828755374-0ee802d9f44b",
  workshops: "1595351298020-038700609878",
  wellness: "1544367567-0f2fcb009e0b",
  outdoor: "1511860810434-a92f84c6f01e",
  charity: "1599059813005-11265ba4b4ce",
  religious: "1512632578888-169bbbc64f33",
};

export function categoryImage(slug: string): string | null {
  const id = PHOTO[slug];
  return id ? `https://images.unsplash.com/photo-${id}?fm=jpg&q=70&w=400&auto=format&fit=crop` : null;
}
