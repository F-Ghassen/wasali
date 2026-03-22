-- Add is_featured flag to routes table
ALTER TABLE routes
ADD COLUMN is_featured BOOLEAN DEFAULT false;

-- Create index for efficient querying of featured routes
CREATE INDEX idx_routes_is_featured ON routes(is_featured) WHERE is_featured = true;

-- Comment
COMMENT ON COLUMN routes.is_featured IS 'Whether this route is featured on the home page';
