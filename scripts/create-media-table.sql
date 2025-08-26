-- Create a sample table with media content
CREATE TABLE IF NOT EXISTS public.media_samples (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    avatar_url TEXT,
    document_url TEXT,
    website_url TEXT,
    logo_image TEXT,
    attachment_file TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB
);

-- Insert sample data with various media types
INSERT INTO public.media_samples (name, description, avatar_url, document_url, website_url, logo_image, attachment_file, metadata) VALUES
(
    'Sample User 1',
    'This is a test user with avatar image',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    'https://github.com',
    'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/github.svg',
    'https://sample-videos.com/csv/Sample-Spreadsheet-10-rows.csv',
    '{"department": "Engineering", "level": "Senior"}'
),
(
    'Sample Company',
    'Company with logo and documents',
    'https://api.dicebear.com/7.x/initials/svg?seed=SC',
    'https://www.africau.edu/images/default/sample.pdf',
    'https://www.google.com',
    'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png',
    'https://sample-videos.com/xls/Sample-Spreadsheet-10-rows.xls',
    '{"industry": "Technology", "employees": 5000}'
),
(
    'Test Product',
    'Product with image gallery',
    'https://picsum.photos/200/200?random=1',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    'https://www.example.com',
    'https://picsum.photos/300/200?random=2',
    'https://sample-videos.com/zip/10mb.zip',
    '{"price": 99.99, "category": "Electronics", "in_stock": true}'
),
(
    'Document Library',
    'Collection of various documents',
    'https://api.dicebear.com/7.x/shapes/svg?seed=docs',
    'https://www.clickdimensions.com/links/TestPDFfile.pdf',
    'https://www.microsoft.com',
    'https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg',
    'https://sample-videos.com/doc/Sample-doc-file-100kb.doc',
    '{"formats": ["PDF", "DOC", "XLS"], "total_files": 150}'
),
(
    'Media Gallery',
    'Various media types showcase',
    'https://picsum.photos/200/200?random=3',
    'https://www.adobe.com/support/products/enterprise/knowledgecenter/media/c4611_sample_explain.pdf',
    'https://www.youtube.com',
    'https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg',
    'https://sample-videos.com/ppt/Sample-PPT-File-500kb.ppt',
    '{"videos": 25, "images": 100, "documents": 50}'
);

-- Grant permissions
GRANT ALL ON public.media_samples TO anon, authenticated;

-- Disable RLS for testing
ALTER TABLE public.media_samples DISABLE ROW LEVEL SECURITY;