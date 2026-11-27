import { Redirect, useLocalSearchParams } from 'expo-router';

/** Old route. Places are added and edited in the Address Book form. */
export default function AddAddressRedirect() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <Redirect href={{ pathname: '/profile/address-form', params: { type: 'place', id: id ?? '' } } as any} />;
}
