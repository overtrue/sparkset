import 'luxon';

declare module 'luxon' {
  // Compatibility shim for legacy luxon typings used by some Adonis packages.
  interface DateTime<IsValid extends boolean = boolean> {
    resolvedLocaleOpts(
      options?: LocaleOptions & DateTimeFormatOptions,
    ): Intl.ResolvedDateTimeFormatOptions;
  }

  interface Zone<IsValid extends boolean = boolean> {
    universal: boolean;
    isUniversal: boolean;
    equals(other: Zone): boolean;
  }

  interface Zone {
    universal: boolean;
    isUniversal: boolean;
    equals(other: Zone): boolean;
  }
}
