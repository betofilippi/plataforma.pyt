'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSheetNavigation } from '@/contexts/SheetNavigationContext'
import { 
  Brain,
  Search,
  Database,
  Upload,
  Download,
  Zap,
  AlertCircle,
  CheckCircle,
  Code,
  FileText,
  Image,
  Music
} from 'lucide-react'

interface VectorCollection {
  name: string
  dimensions: number
  vectors: number
  model: string
  status: 'ready' | 'indexing' | 'error'
}

interface SearchResult {
  id: string
  content: string
  similarity: number
  metadata: any
}

export function VectorManager({ projectRef }: { projectRef: string }) {
  const [collections, setCollections] = useState<VectorCollection[]>([
    { name: 'documents', dimensions: 1536, vectors: 1250, model: 'text-embedding-ada-002', status: 'ready' },
    { name: 'images', dimensions: 512, vectors: 450, model: 'clip-vit-base-patch32', status: 'ready' },
    { name: 'products', dimensions: 768, vectors: 3200, model: 'all-MiniLM-L6-v2', status: 'indexing' },
  ])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [embeddingText, setEmbeddingText] = useState('')

  const { push } = useSheetNavigation()

  const handleSearch = () => {
    // Simulated search results
    setSearchResults([
      { id: '1', content: 'PostgreSQL vector similarity search', similarity: 0.95, metadata: { type: 'doc' } },
      { id: '2', content: 'Supabase pgvector extension guide', similarity: 0.89, metadata: { type: 'doc' } },
      { id: '3', content: 'AI embeddings with OpenAI', similarity: 0.82, metadata: { type: 'tutorial' } },
    ])
  }

  const handleCollectionClick = (collection: VectorCollection) => {
    push({
      title: `Collection: ${collection.name}`,
      component: (
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>{collection.name}</CardTitle>
              <CardDescription>
                {collection.vectors} vectors • {collection.dimensions} dimensions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Model</Label>
                    <p className="text-sm text-muted-foreground mt-1">{collection.model}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge className="mt-1" variant={collection.status === 'ready' ? 'default' : 'secondary'}>
                      {collection.status}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label>Index Configuration</Label>
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <code className="text-xs">
                      CREATE INDEX ON {collection.name} USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
                    </code>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1" variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Import Vectors
                  </Button>
                  <Button className="flex-1" variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export Vectors
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Vector / Embeddings</h2>
            <p className="text-muted-foreground">
              Manage vector embeddings for AI-powered search and similarity
            </p>
          </div>
          <Button>
            <Brain className="mr-2 h-4 w-4" />
            Create Collection
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-medium">{collections.length}</span> collections
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-medium">5,900</span> total vectors
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">pgvector enabled</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <Tabs defaultValue="collections" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="collections">Collections</TabsTrigger>
              <TabsTrigger value="search">Search</TabsTrigger>
              <TabsTrigger value="embeddings">Embeddings</TabsTrigger>
              <TabsTrigger value="models">Models</TabsTrigger>
            </TabsList>

            <TabsContent value="collections" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Vector Collections</CardTitle>
                  <CardDescription>
                    Manage your vector collections and indexes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {collections.map((collection) => (
                      <div
                        key={collection.name}
                        onClick={() => handleCollectionClick(collection)}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          {collection.name === 'images' ? (
                            <Image className="h-4 w-4 text-muted-foreground" />
                          ) : collection.name === 'documents' ? (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Database className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium">{collection.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {collection.dimensions}D • {collection.vectors} vectors
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={collection.status === 'ready' ? 'default' : 'secondary'}>
                            {collection.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {collection.model}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="search" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Similarity Search</CardTitle>
                  <CardDescription>
                    Search for similar vectors using cosine similarity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="collection">Collection</Label>
                      <Select defaultValue="documents">
                        <SelectTrigger id="collection" className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="documents">documents</SelectItem>
                          <SelectItem value="images">images</SelectItem>
                          <SelectItem value="products">products</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="query">Search Query</Label>
                      <Input
                        id="query"
                        placeholder="Enter text to find similar content"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="mt-2"
                      />
                    </div>

                    <Button onClick={handleSearch} className="w-full">
                      <Search className="mr-2 h-4 w-4" />
                      Search Similar
                    </Button>

                    {searchResults.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <Label>Results</Label>
                        {searchResults.map((result) => (
                          <div key={result.id} className="p-3 border rounded-lg">
                            <div className="flex items-start justify-between">
                              <p className="text-sm">{result.content}</p>
                              <Badge variant="outline">{(result.similarity * 100).toFixed(0)}%</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="embeddings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Generate Embeddings</CardTitle>
                  <CardDescription>
                    Convert text or media into vector embeddings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="model">Embedding Model</Label>
                      <Select defaultValue="text-embedding-ada-002">
                        <SelectTrigger id="model" className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text-embedding-ada-002">OpenAI Ada v2</SelectItem>
                          <SelectItem value="text-embedding-3-small">OpenAI v3 Small</SelectItem>
                          <SelectItem value="text-embedding-3-large">OpenAI v3 Large</SelectItem>
                          <SelectItem value="all-MiniLM-L6-v2">MiniLM L6</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="text">Input Text</Label>
                      <Textarea
                        id="text"
                        placeholder="Enter text to generate embeddings"
                        value={embeddingText}
                        onChange={(e) => setEmbeddingText(e.target.value)}
                        className="mt-2"
                        rows={4}
                      />
                    </div>

                    <Button className="w-full">
                      <Zap className="mr-2 h-4 w-4" />
                      Generate Embedding
                    </Button>

                    <div className="p-3 bg-muted rounded-lg">
                      <Label>Example SQL</Label>
                      <code className="text-xs block mt-2">
                        INSERT INTO documents (content, embedding)<br />
                        VALUES ('Your text', ai_embedding('Your text'));
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="models" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Embedding Models</CardTitle>
                  <CardDescription>
                    Configure and manage embedding models
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">OpenAI text-embedding-ada-002</h4>
                        <Badge>Active</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">1536 dimensions • $0.0001 per 1K tokens</p>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">OpenAI text-embedding-3-small</h4>
                        <Badge variant="outline">Available</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">1536 dimensions • $0.00002 per 1K tokens</p>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Sentence Transformers MiniLM</h4>
                        <Badge variant="outline">Available</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">384 dimensions • Self-hosted</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  )
}