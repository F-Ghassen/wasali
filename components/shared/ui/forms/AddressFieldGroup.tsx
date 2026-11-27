import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Controller, type Control, type FieldErrors, type UseFormSetValue, type UseFormWatch } from 'react-hook-form';
import { Spacing } from '@/constants/spacing';
import { Input } from '@/components/shared/ui/primitives/Input';
import { CityPickerInput } from '@/components/shared/ui/forms/CityPickerInput';
import { CountryPickerInput } from '@/components/shared/ui/forms/CountryPickerInput';
import { useCitiesStore } from '@/stores/citiesStore';
import type { AddressBookFormValues } from '@/utils/addressBookForm';

interface AddressFieldGroupProps {
  control: Control<AddressBookFormValues>;
  watch: UseFormWatch<AddressBookFormValues>;
  setValue: UseFormSetValue<AddressBookFormValues>;
  errors: FieldErrors<AddressBookFormValues>;
}

/**
 * Country, street, postcode and city for one address. Used by a place and by a
 * person's address. The city list follows the chosen country.
 */
export function AddressFieldGroup({ control, watch, setValue, errors }: AddressFieldGroupProps) {
  const { cities, countries, countryFlags, fetchCities } = useCitiesStore();
  const country = watch('country');

  useEffect(() => {
    fetchCities();
  }, [fetchCities]);

  const citiesInCountry = cities.filter((c) => c.country === country);

  return (
    <>
      <Controller control={control} name="country" render={({ field: { onChange, value } }) => (
        <CountryPickerInput
          label="Country *"
          value={value}
          countries={countries}
          flags={countryFlags}
          error={errors.country?.message}
          onChange={(nextCountry) => {
            // A city from another country no longer fits, so clear it.
            const cityStillFits = cities.some((c) => c.name === watch('city') && c.country === nextCountry);
            if (!cityStillFits) setValue('city', '', { shouldDirty: true });
            onChange(nextCountry);
          }}
        />
      )} />
      <Controller control={control} name="street" render={({ field: { onChange, onBlur, value } }) => (
        <Input label="Street *" placeholder="e.g. 12 Hauptstraße" onChangeText={onChange} onBlur={onBlur} value={value} error={errors.street?.message} />
      )} />
      <View style={styles.cityRow}>
        <View style={styles.flex}>
          <Controller control={control} name="postalCode" render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Postal Code *" keyboardType="numeric" onChangeText={onChange} onBlur={onBlur} value={value} error={errors.postalCode?.message} />
          )} />
        </View>
        <View style={styles.flex}>
          <CityPickerInput
            label="City *"
            value={watch('city')}
            cities={citiesInCountry}
            placeholder={country ? 'Select city' : 'Choose a country first'}
            error={errors.city?.message}
            onChange={(city) => setValue('city', city.name, { shouldDirty: true, shouldValidate: true })}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cityRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.base },
});
