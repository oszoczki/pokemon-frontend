'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../components/DashboardLayout';
import Spinner from '../components/Spinner';

interface Pokemon {
  id: number;
  name: string;
  imageUrl: string;
  types: string[];
  height: number;
  weight: number;
  abilities: string[];
}

interface PokeAPIPokemon {
  id: number;
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

type DisplayPokemon = Pokemon | PokeAPIPokemon;

export default function Dashboard() {
  const router = useRouter();
  const [pokemons, setPokemons] = useState<Pokemon[]>([]);
  const [allPokemons, setAllPokemons] = useState<PokeAPIPokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isCatching, setIsCatching] = useState<number | null>(null);
  const [isReleasing, setIsReleasing] = useState<number | null>(null);
  const [searchOnlyOwn, setSearchOnlyOwn] = useState(false);
  const [selectedPokemon, setSelectedPokemon] = useState<DisplayPokemon | null>(null);
  const [isLoadingPokemons, setIsLoadingPokemons] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/');
      return;
    }

    const fetchPokemons = async () => {
      try {
        setIsLoadingPokemons(true);
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

        // Extract unique types from all Pokémon
        const types = new Set<string>();
        data.forEach((pokemon: Pokemon) => {
          pokemon.types.forEach(type => types.add(type));
        });
        setAvailableTypes(['all', ...Array.from(types).sort()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Hiba történt a pokémonok betöltése során');
      } finally {
        setLoading(false);
        setIsLoadingPokemons(false);
      }
    };

    fetchPokemons();
  }, [router]);

  const searchPokemons = async (query: string) => {
    if (!query.trim()) {
      setAllPokemons([]);
      return;
    }

    if (searchOnlyOwn) {
      // Search only in our own Pokémon
      const filtered = pokemons.filter(pokemon => 
        pokemon.name.toLowerCase().includes(query.toLowerCase())
      );
      setAllPokemons([]); // Clear PokeAPI results
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0`);
      const data = await response.json();
      
      const matchingPokemons = data.results.filter((pokemon: { name: string }) => 
        pokemon.name.toLowerCase().includes(query.toLowerCase())
      );

      // Fetch details for matching Pokémon
      const pokemonDetails = await Promise.all(
        matchingPokemons.slice(0, 20).map((pokemon: { url: string }) =>
          fetch(pokemon.url).then(res => res.json())
        )
      );

      setAllPokemons(pokemonDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba történt a keresés során');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchPokemons(searchTerm);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, searchOnlyOwn]);

  const handleCatchPokemon = async (pokemon: DisplayPokemon) => {
    try {
      setIsCatching(pokemon.id);
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/');
        return;
      }

      const newPokemon = {
        name: pokemon.name,
        imageUrl: isPokeAPIPokemon(pokemon) ? pokemon.sprites?.front_default || '' : pokemon.imageUrl,
        types: isPokeAPIPokemon(pokemon) ? pokemon.types?.map(t => t.type.name) || [] : pokemon.types,
        height: (pokemon.height || 0),
        weight: (pokemon.weight || 0),
        abilities: isPokeAPIPokemon(pokemon) ? pokemon.abilities?.map(a => a.ability.name) || [] : pokemon.abilities || []
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
      setSearchTerm('');
      setAllPokemons([]);
      setSelectedType('all');
      
      // Refresh the page
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba történt a pokémon elkapása során');
    } finally {
      setIsCatching(null);
    }
  };

  let filteredPokemons = searchTerm
    ? allPokemons.map(pokemon => ({
        id: parseInt(pokemon.url?.split('/').slice(-2, -1)[0] || '0'),
        name: pokemon.name,
        imageUrl: pokemon.sprites?.front_default || '',
        types: pokemon.types?.map(t => t.type.name) || [],
        height: (pokemon.height || 0) / 10,
        weight: (pokemon.weight || 0) / 10,
        abilities: pokemon.abilities?.map(a => a.ability.name) || []
      }))
    : pokemons;

  const isPokeAPIPokemon = (pokemon: DisplayPokemon): pokemon is PokeAPIPokemon => {
    return 'url' in pokemon;
  };

  const getPokemonImage = (pokemon: DisplayPokemon): string => {
    if (isPokeAPIPokemon(pokemon)) {
      return pokemon.sprites?.front_default || '';
    }
    return pokemon.imageUrl;
  };

  const getPokemonTypes = (pokemon: DisplayPokemon): string[] => {
    if (isPokeAPIPokemon(pokemon)) {
      return pokemon.types?.map(t => t.type.name) || [];
    }
    return pokemon.types;
  };

  const getPokemonAbilities = (pokemon: DisplayPokemon): string[] => {
    if (isPokeAPIPokemon(pokemon)) {
      return pokemon.abilities?.map(a => a.ability.name) || [];
    }
    return pokemon.abilities || [];
  };

  const handleViewPokemon = (pokemon: DisplayPokemon) => {
    setSelectedPokemon(pokemon);
  };

  const handleReleasePokemon = async (id: number) => {
    try {
      setIsReleasing(id);
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(`http://localhost:3100/pokemons/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        mode: 'cors',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Nem sikerült elengedni a pokémont');
      }

      // Remove the Pokémon from the local state
      setPokemons(pokemons.filter(p => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba történt a pokémon elengedése során');
    } finally {
      setIsReleasing(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-96">
          <p className="text-gray-500">Betöltés...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-96">
          <p className="text-red-500">{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Pokémonok</h1>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Keresés név alapján..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-black"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setAllPokemons([]);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="searchOnlyOwn"
                checked={searchOnlyOwn}
                onChange={(e) => setSearchOnlyOwn(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="searchOnlyOwn" className="text-sm text-gray-700">
                Csak saját pokémonok
              </label>
            </div>
            {!searchTerm && (
              <div className="flex items-center gap-2">
                <label htmlFor="type-select" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Típus:
                </label>
                <select
                  id="type-select"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-black"
                >
                  {availableTypes.map((type) => (
                    <option key={type} value={type}>
                      {type === 'all' ? 'Összes típus' : type}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoadingPokemons ? (
            <div className="flex justify-center items-center h-64">
              <Spinner size="lg" />
            </div>
          ) : (
            (searchOnlyOwn ? pokemons : filteredPokemons)
              .filter(pokemon => 
                searchTerm ? pokemon.name.toLowerCase().includes(searchTerm.toLowerCase()) : true
              )
              .map((pokemon) => (
              <div
                key={pokemon.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                onClick={() => handleViewPokemon(pokemon)}
              >
                <div className="p-4">
                  <div className="flex justify-center mb-4">
                    <img
                      src={getPokemonImage(pokemon)}
                      alt={pokemon.name}
                      className="h-32 w-32 object-contain"
                    />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 text-center capitalize">
                    {pokemon.name}
                  </h2>
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    {getPokemonTypes(pokemon).map((type) => (
                      <span
                        key={`${pokemon.id}-${type}`}
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          type === selectedType && selectedType !== 'all'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Magasság:</span> {pokemon.height} m
                    </div>
                    <div>
                      <span className="font-medium">Súly:</span> {pokemon.weight} kg
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {filteredPokemons.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm
                ? 'Nincs találat a keresési feltételeknek megfelelően.'
                : selectedType !== 'all'
                ? 'Nincs találat a kiválasztott típusra.'
                : 'Nincs elérhető pokémon.'}
            </p>
          </div>
        )}

        {/* Pokémon Details Modal */}
        {selectedPokemon && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900 capitalize">
                  {selectedPokemon.name}
                </h2>
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
                    src={getPokemonImage(selectedPokemon)}
                    alt={selectedPokemon.name}
                    className="h-48 w-48 object-contain"
                  />
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {getPokemonTypes(selectedPokemon).map((type) => (
                      <span
                        key={`${selectedPokemon.id}-${type}`}
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
                    <div className="mt-2 flex flex-wrap gap-2">
                      {getPokemonAbilities(selectedPokemon).map((ability) => (
                        <span
                          key={`${selectedPokemon.id}-${ability}`}
                          className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800"
                        >
                          {ability}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4">
                    {pokemons.some(p => p.id === selectedPokemon.id) ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReleasePokemon(selectedPokemon.id);
                          setSelectedPokemon(null);
                        }}
                        disabled={isReleasing === selectedPokemon.id}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isReleasing === selectedPokemon.id ? 'Elengedés...' : 'Elengedés'}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCatchPokemon(selectedPokemon);
                          setSelectedPokemon(null);
                        }}
                        disabled={isCatching === selectedPokemon.id}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCatching === selectedPokemon.id ? 'Elkapás...' : 'Elkapás'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}