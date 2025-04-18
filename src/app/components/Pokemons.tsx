'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Pokemon {
  id: number;
  name: string;
  imageUrl: string;
  types: string[];
  height: number;
  weight: number;
  abilities: string[];
  stats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
}

interface PokeAPIPokemon {
  name: string;
  url: string;
  sprites: {
    front_default: string;
  };
  types: {
    type: {
      name: string;
    };
  }[];
  height: number;
  weight: number;
  abilities: {
    ability: {
      name: string;
    };
  }[];
}

type SortField = 'id' | 'name' | 'height' | 'weight';
type SortDirection = 'asc' | 'desc';

export default function Pokemons() {
  const router = useRouter();
  const [pokemons, setPokemons] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showCatchModal, setShowCatchModal] = useState(false);
  const [availablePokemons, setAvailablePokemons] = useState<PokeAPIPokemon[]>([]);
  const [selectedPokeAPIPokemon, setSelectedPokeAPIPokemon] = useState<PokeAPIPokemon | null>(null);
  const [isLoadingPokemons, setIsLoadingPokemons] = useState(false);
  const [isReleasing, setIsReleasing] = useState<number | null>(null);
  const [pokemonToRelease, setPokemonToRelease] = useState<Pokemon | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/');
      return;
    }

    const fetchPokemons = async () => {
      try {
        const response = await fetch('http://localhost:3100/pokemons', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          mode: 'cors',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Nem sikerült betölteni a pokémonokat');
        }

        const data = await response.json();
        setPokemons(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Hiba történt a pokémonok betöltése során');
      } finally {
        setLoading(false);
      }
    };

    fetchPokemons();
  }, [router]);

  const handleView = (pokemon: Pokemon) => {
    setSelectedPokemon(pokemon);
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedPokemons = pokemons
    .filter(pokemon => {
      const searchLower = searchTerm.toLowerCase();
      return (
        pokemon.name.toLowerCase().includes(searchLower) ||
        pokemon.types.some(type => type.toLowerCase().includes(searchLower))
      );
    })
    .sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      if (sortField === 'name') {
        return direction * a.name.localeCompare(b.name);
      }
      return direction * (a[sortField] - b[sortField]);
    });

  const totalPages = Math.ceil(filteredAndSortedPokemons.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedPokemons = filteredAndSortedPokemons.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const fetchRandomPokemons = async () => {
    try {
      setIsLoadingPokemons(true);
      setError('');

      // Get all Pokémon URLs
      const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0');
      const responseData = await response.json();
      
      // Randomly select 5 Pokémon URLs
      const shuffled = [...responseData.results].sort(() => 0.5 - Math.random());
      const selectedPokemonUrls = shuffled.slice(0, 5);

      // Fetch details for each selected Pokémon
      const pokemonPromises = selectedPokemonUrls.map(pokemon =>
        fetch(pokemon.url).then(res => res.json())
      );

      const pokemonData = await Promise.all(pokemonPromises);
      setAvailablePokemons(pokemonData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba történt a pokémonok betöltése során');
    } finally {
      setIsLoadingPokemons(false);
    }
  };

  const handleCatchPokemon = async () => {
    if (!selectedPokeAPIPokemon) return;

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/');
        return;
      }

      const newPokemon = {
        name: selectedPokeAPIPokemon.name,
        imageUrl: selectedPokeAPIPokemon.sprites.front_default,
        types: selectedPokeAPIPokemon.types.map(t => t.type.name),
        height: selectedPokeAPIPokemon.height / 10, // Convert to meters
        weight: selectedPokeAPIPokemon.weight / 10, // Convert to kilograms
        abilities: selectedPokeAPIPokemon.abilities.map(a => a.ability.name)
      };

      const response = await fetch('http://localhost:3100/pokemons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newPokemon),
        mode: 'cors',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Nem sikerült elkapni a pokémont');
      }

      const data = await response.json();
      setPokemons([...pokemons, data]);
      setShowCatchModal(false);
      setSelectedPokeAPIPokemon(null);
      setAvailablePokemons([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba történt a pokémon elkapása során');
    }
  };

  const handleReleasePokemon = async (pokemonId: number) => {
    try {
      setIsReleasing(pokemonId);
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(`http://localhost:3100/pokemons/${pokemonId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        mode: 'cors',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Nem sikerült elengedni a pokémont');
      }

      setPokemons(pokemons.filter(p => p.id !== pokemonId));
      setPokemonToRelease(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba történt a pokémon elengedése során');
    } finally {
      setIsReleasing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-gray-500">Betöltés...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <button
          onClick={() => {
            setShowCatchModal(true);
            fetchRandomPokemons();
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          Új Pokémon elkapása
        </button>
        <div className="flex items-center gap-2">
          <label htmlFor="pageSize" className="text-sm text-black">
            Oldalanként:
          </label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Keresés név vagy típus alapján..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('id')}
              >
                <div className="flex items-center">
                  ID
                  {sortField === 'id' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kép
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Név
                  {sortField === 'name' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Típusok
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('height')}
              >
                <div className="flex items-center">
                  Magasság
                  {sortField === 'height' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('weight')}
              >
                <div className="flex items-center">
                  Súly
                  {sortField === 'weight' && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Műveletek
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedPokemons.map((pokemon) => (
              <tr key={pokemon.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {pokemon.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <img
                    src={pokemon.imageUrl}
                    alt={pokemon.name}
                    className="h-16 w-16 object-contain"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {pokemon.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    {pokemon.types.map((type, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {pokemon.height} m
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {pokemon.weight} kg
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleView(pokemon)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Megtekintés
                    </button>
                    <button
                      onClick={() => {
                        setPokemonToRelease(pokemon);
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      Elengedés
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Összesen: {filteredAndSortedPokemons.length} pokémon
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-black"
          >
            &laquo;
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-black"
          >
            &lsaquo;
          </button>
          <span className="px-3 py-1">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-black"
          >
            &rsaquo;
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-black"
          >
            &raquo;
          </button>
        </div>
      </div>

      {showCatchModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Új Pokémon elkapása</h2>
              <button
                onClick={() => {
                  setShowCatchModal(false);
                  setSelectedPokeAPIPokemon(null);
                  setAvailablePokemons([]);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Bezárás</span>
                ×
              </button>
            </div>

            {isLoadingPokemons ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-gray-500">Pokémonok betöltése...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availablePokemons.map((pokemon) => (
                    <div
                      key={pokemon.name}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedPokeAPIPokemon?.name === pokemon.name
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                      onClick={() => setSelectedPokeAPIPokemon(pokemon)}
                    >
                      <div className="flex flex-col items-center">
                        <img
                          src={pokemon.sprites.front_default}
                          alt={pokemon.name}
                          className="h-24 w-24 object-contain"
                        />
                        <h3 className="mt-2 text-lg font-medium text-gray-900 capitalize">
                          {pokemon.name}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {pokemon.types.map((type, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 capitalize"
                            >
                              {type.type.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => {
                      setShowCatchModal(false);
                      setSelectedPokeAPIPokemon(null);
                      setAvailablePokemons([]);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Mégse
                  </button>
                  <button
                    onClick={handleCatchPokemon}
                    disabled={!selectedPokeAPIPokemon}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Elkapás
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedPokemon && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{selectedPokemon.name}</h2>
              <button
                onClick={() => setSelectedPokemon(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Bezárás</span>
                ×
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col items-center">
                <img
                  src={selectedPokemon.imageUrl}
                  alt={selectedPokemon.name}
                  className="h-48 w-48 object-contain mb-4"
                />
                <div className="flex space-x-2 mb-4">
                  {selectedPokemon.types.map((type, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-sm font-semibold rounded-full bg-indigo-100 text-indigo-800"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Magasság</h3>
                    <p className="mt-1 text-sm text-gray-900">{selectedPokemon.height} m</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Súly</h3>
                    <p className="mt-1 text-sm text-gray-900">{selectedPokemon.weight} kg</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Képességek</h3>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedPokemon.abilities.map((ability, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800"
                      >
                        {ability}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Release Confirmation Modal */}
      {pokemonToRelease && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Pokémon elengedése</h2>
              <button
                onClick={() => setPokemonToRelease(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Bezárás</span>
                ×
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600">
                Biztosan el szeretnéd engedni a(z) <span className="font-semibold">{pokemonToRelease.name}</span> pokémont?
                Ez a művelet nem vonható vissza.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setPokemonToRelease(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Mégse
                </button>
                <button
                  onClick={() => handleReleasePokemon(pokemonToRelease.id)}
                  disabled={isReleasing === pokemonToRelease.id}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isReleasing === pokemonToRelease.id ? 'Elengedés...' : 'Elengedés'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 