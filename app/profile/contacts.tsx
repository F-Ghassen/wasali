import { Redirect } from 'expo-router';

/** Old route. Contacts now live in the Address Book. */
export default function ContactsRedirect() {
  return <Redirect href={'/profile/address-book?segment=people' as any} />;
}
