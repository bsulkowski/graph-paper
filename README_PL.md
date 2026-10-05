# Papier w kratkę

*Dostępne także po angielsku: [README](README.md)*

Papier do druku z siatką kwadratową, prostokątną, trójkątną, sześciokątną i biegunową —
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
| Biegunowa | wycinek pierścienia, wszędzie o tym samym polu | *g* komórek; liczbę dużych pól w pierścieniu ustawia się osobno |

Sześciokątów nie da się złożyć z sześciokątów, więc obrys dużego sześciokąta przecina małe
komórki: pokazuje skalę, a nie grupę całych komórek.

W siatce biegunowej każda komórka ma to samo pole, od środka aż po brzeg. Liczba wycinków
rośnie na zewnątrz skokami, tam gdzie komórki zrobiłyby się za szerokie, a okręgi i promienie
dużych pól zawsze biegną po liniach małych.

Pole rośnie o √2 na krok, od 6,25 do 800 mm², więc co drugi krok się podwaja: 25 mm² to zwykła
kratka 5 mm, 100 mm² — kratka 1 cm.

## Nazwy arkuszy

Każdy arkusz ma nazwę w rodzaju `square_grid_24x36x50mm2`: rodzaj siatki, liczba dużych pól
na kartce, liczba komórek w każdym z nich i pole jednej komórki. Drukuje się w lewym dolnym
rogu i służy za nazwę pliku.

Gotowe arkusze A4 są w katalogu [`examples/`](examples).

## Kod

Jeden moduł TypeScript, [`src/graph-paper.ts`](src/graph-paper.ts), bez zależności i bez
dostępu do DOM. Działa w przeglądarce i w Node ≥ 22.12 (z `--experimental-strip-types`).
Przykład użycia i opis instalacji są w [README](README.md#using-the-code) po angielsku.

**Zgodność:** nazwy i znaczenie parametrów linku się nie zmieniają, więc zapisany dziś link
otworzy później tę samą siatkę. Nowa opcja to nowy parametr, którego wartość domyślna rysuje
to samo co dotąd. Rozmieszczenie siatki na kartce może się jeszcze poprawiać.

## Licencja

[MIT](LICENSE) — Bartosz Sułkowski.
