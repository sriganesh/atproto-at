import { redirect } from 'next/navigation';

// Define the props type
type PageProps = {
  params: {
    path?: string[] | undefined;
  };
};

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Main Page component
export default async function Page(props: PageProps) {
  return <PageContent {...props} />;
}

// Helper: serialize AT protocol URI components
function serializeAtUri(parts: string[]): string {
  if (!parts || parts.length === 0) {
    return '';
  }

  // Join all parts to form an AT protocol URI
  // If there's a DID (first part starting with 'did:')
  const uri = parts.join('/');
  
  // URI encode properly
  return encodeURIComponent(uri);
}

// Separate component to handle the async content
async function PageContent({ params }: PageProps) {
  // IMPORTANT: Fix for Next.js async params issue
  // Need to make sure params.path is properly awaited
  const pathSegments = await Promise.resolve(params?.path) || [];
  
  // Empty path case
  if (pathSegments.length === 0) {
    return redirect('/');
  }

  // Create the URI parameter
  const uri = serializeAtUri(pathSegments);
  
  // Redirect to the viewer page with the URI as a parameter
  if (uri) {
    return redirect(`/viewer?uri=${uri}`);
  } else {
    // Fallback if URI creation fails
    return redirect('/');
  }
} 