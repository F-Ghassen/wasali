import { Redirect, useLocalSearchParams } from 'expo-router';

/** Old route. People are edited in the Address Book form. */
export default function ContactRedirect() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <Redirect href={{ pathname: '/profile/address-form', params: { type: 'person', id: id ?? '' } } as any} />;
}
