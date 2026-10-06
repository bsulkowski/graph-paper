# Papier w kratkę

*Dostępne także po angielsku: [README](README.md)*

Papier do druku z siatką kwadratową, prostokątną, trójkątną, sześciokątną, kagome i biegunową —
komórki mierzone polem. Kartkę rysuje się w przeglądarce na
**[bsulkowski.pl/pl/graph-paper](https://bsulkowski.pl/pl/graph-paper)**; w tym repozytorium
jest kod, który ją rysuje.

## Pomysł

Wielkość komórki podaje się jako jej pole, a nie bok. Kwadraty po 50 mm² i sześciokąty
po 50 mm² dzielą kartkę na komórki tej samej wielkości, więc zmiana siatki nie zmienia skali.
Co kilka komórek łączy się w duże pole obwiedzione ciemniejszą linią — do liczenia i mierzenia
bez linijki — a siatka wypełnia kartkę całymi dużymi polami.

| Siatka | Komórka | Duże pole |
|---|---|---|
| Kwadratowa | kwadrat | *k* × *k* kwadratów |
| Prostokątna | prostokąt o bokach 1 : √2, jak kartka A | *k* × *k* prostokątów |
| Trójkątna | trójkąt równoboczny | trójkąt o boku *k*, złożony z *k*² komórek |
| Sześciokątna | sześciokąt foremny | sześciokąt o *k*² razy większym polu, ze środkiem w środku małego |
| Kagome | sześciokąt foremny, w każdym rogu trójkąt o szóstej części jego pola | co *k*-ta linia (*k* nieparzyste, do 9): ten sam wzór *k* razy większy |
| Biegunowa | wycinek pierścienia, wszędzie o tym samym polu | *g* komórek; liczbę dużych pól w pierścieniu ustawia się osobno |
| Biegunowa, ⅓ koła | to samo, na wycinku 120° | to samo; liczba dużych pól dotyczy łuku wycinka |

W pozostałych siatkach *k* wynosi od 1 do 10. Obrócenie kartki obraca siatkę razem z nią:
kartka pozioma z wysokimi prostokątami to kartka pionowa z szerokimi, oglądana z boku.

Duże trójkąty trzymające się reszty tylko jednym bokiem sterczałyby jak ostre zęby, więc się
ich nie rysuje — w siatce trójkątnej i w kagome; na brzegu zostają tylko tępe narożniki.

Sześciokątów nie da się złożyć z sześciokątów, więc obrys dużego sześciokąta przecina małe
komórki: pokazuje skalę, a nie grupę całych komórek.

Kagome (siatka trójheksagonalna) to siatka trójkątna, w której jedną z trzech rodzin linii
przesunięto o pół odstępu: żadne trzy linie już się nie spotykają, więc każde skrzyżowanie
rozchyla się w mały trójkąt, a między trójkątami powstają sześciokąty. Wszystkie linie biegną
na przestrzał, co przydaje się w ornamentach i gwiazdach, plecionkach
i haftach oraz na planszach, gdzie sześciokąty są polami, a trójkąty skrzyżowaniami. Pole
dotyczy sześciokąta, więc przy tym samym ustawieniu sześciokąty są takie jak w siatce
sześciokątnej. Jak wszędzie, na kartce są całe duże pola — duże sześciokąty, które się
mieszczą, i duże trójkąty obok nich — więc brzeg ma załamania ich obrysu.

Siatka biegunowa jest **eksperymentalna**: jej rysunek i parametry linku mogą się jeszcze zmienić.

W siatce biegunowej każda komórka ma to samo pole, od środka aż po brzeg. Liczba wycinków
rośnie na zewnątrz skokami, tam gdzie komórki zrobiłyby się za szerokie, a okręgi i promienie
dużych pól zawsze biegną po liniach małych.

Siatkę biegunową można też narysować na jednej trzeciej koła. Wycinek 120° z prostym bokiem
wzdłuż dłuższej krawędzi kartki to największy kawałek koła, jaki mieści się na arkuszu: na A4
ma o mniej więcej jedną czwartą więcej miejsca niż całe koło. Linie są te same co w całym kole
z trzy razy większą liczbą dużych pól, więc trzy kartki złożone razem dają jedno koło
o średnicy około 37 cm, a pojedynczą da się zwinąć w stożek. Pasuje też do diagramów, które
rozszerzają się od jednego punktu, jak wachlarz przodków — czytany przy obróconej kartce.

Pole wybiera się z [Human Scale Numbers](https://github.com/bsulkowski/human-scale-numbers)
— 1; 1,25; 1,6; 2; 2,5; 3,2; 4; 5; 6,4; 8; 10 … — od 1 mm² (papier milimetrowy) do 10 cm².
Co trzeci krok pole się podwaja, co dziesiąty rośnie dziesięciokrotnie: 25 mm² to zwykła
kratka 5 mm, 100 mm² — kratka 1 cm.

## Nazwy arkuszy

Każdy arkusz ma nazwę w rodzaju `square_grid_24x36x50mm2`: rodzaj siatki, liczba dużych pól
na kartce, liczba komórek w każdym z nich i pole jednej komórki. Drukuje się w lewym dolnym
rogu i służy za nazwę pliku. Siatka biegunowa na jednej trzeciej koła nazywa się `sector_grid_…`.

Gotowe arkusze A4 są w katalogu [`examples/`](examples).

## Kod

Jeden moduł TypeScript, [`src/graph-paper.ts`](src/graph-paper.ts), bez zależności i bez
dostępu do DOM. Działa w przeglądarce i w Node ≥ 22.12 (z `--experimental-strip-types`).
Przykład użycia i opis instalacji są w [README](README.md#using-the-code) po angielsku.

**Zgodność:** nazwy i znaczenie parametrów linku się nie zmieniają, więc zapisany dziś link
otworzy później tę samą siatkę. Nowa opcja to nowy parametr, którego wartość domyślna rysuje
to samo co dotąd. Rozmieszczenie siatki na kartce może się jeszcze poprawiać.

- **1.4** — duże pole od 1 do 10 (kagome: nieparzyste, do 9); własny kolor linii
  (`ink=1f3a7a`); bez obracania siatki na kartce (`turn=1` ze starszego linku obraca kartkę);
  bez dużych trójkątów trzymających się jednym bokiem.
- **1.3** — pole komórki ze skali Human Scale Numbers, od 1 mm² do 10 cm² (`area` ze starszego
  linku czyta się jako najbliższą wartość); siatka kagome z całymi dużymi polami jak pozostałe.
- **1.2** — siatka kagome (`grid=kagome`).
- **1.1** — siatka biegunowa na jednej trzeciej koła (`part=3`).
- **1.0** — pierwsza wersja.

## Licencja

[MIT](LICENSE) — Bartosz Sułkowski.
