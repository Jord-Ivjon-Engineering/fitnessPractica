import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import ReactCountryFlag from "react-country-flag";

interface Country {
  code: string;
  country: string;
  flag: string;
  isoCode: string;
}

interface CountryCodeSelectorProps {
  countries: Country[];
  value: string;
  onChange: (code: string) => void;
}

const CountryCodeSelector = ({ countries, value, onChange }: CountryCodeSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCountry = countries.find(c => c.code === value) || countries[0];

  const filteredCountries = countries.filter(
    (country) =>
      country.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.code.includes(searchQuery) ||
      country.flag.includes(searchQuery)
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Focus search input when dropdown opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="relative w-32" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full pl-8 pr-6 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-xs cursor-pointer flex items-center justify-between"
      >
        <div className="flex items-center gap-1">
          <ReactCountryFlag
            countryCode={selectedCountry.isoCode}
            svg
            style={{
              width: '1rem',
              height: '1rem',
            }}
            title={selectedCountry.country}
          />
          <span className="text-xs font-medium">{selectedCountry.code}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-background border border-border rounded-md shadow-lg z-50 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country..."
                className="w-full pl-8 pr-8 py-1.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Country List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredCountries.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                No countries found
              </div>
            ) : (
              filteredCountries.map((country, index) => (
                <button
                  key={`${country.code}-${country.country}-${index}`}
                  type="button"
                  onClick={() => handleSelect(country.code)}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent transition-colors ${
                    value === country.code ? "bg-accent font-medium" : ""
                  }`}
                >
                  <ReactCountryFlag
                    countryCode={country.isoCode}
                    svg
                    style={{
                      width: '1.25rem',
                      height: '1.25rem',
                    }}
                    title={country.country}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="font-medium">{country.code}</span>
                    <span className="text-muted-foreground ml-2">{country.country}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CountryCodeSelector;

