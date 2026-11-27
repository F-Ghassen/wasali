import { Redirect } from 'expo-router';

/** Old route. The sender's own addresses now live on My addresses. */
export default function AddressesRedirect() {
  return <Redirect href={'/profile/my-addresses' as any} />;
}
