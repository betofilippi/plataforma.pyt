import { useState, useEffect, useCallback, useMemo } from 'react'
import { Editor } from '@monaco-editor/react'
import { Button } from '@/components/ui/button'
import { ResultsTable } from '@/components/results-table'
import { Label } from '@/components/ui/label'
import { useRunQuery } from '@/hooks/use-run-query'
import {
  ArrowUp,
  Loader2,
  BarChart as BarChartIcon,
  Wand,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface SqlEditorProps {
  projectRef: string
  initialSql?: string
  queryKey?: any
  label?: string
  onResults?: (data: any[] | undefined) => void
  onRowClick?: (row: any, queryKey?: any) => void
  hideSql?: boolean
  readOnly?: boolean
  runAutomatically?: boolean
  refetch?: number
  initialNaturalLanguageMode?: boolean
  hideChartOption?: boolean
}

export function SqlEditor({
  projectRef,
  initialSql,
  queryKey,
  onResults,
  onRowClick,
  label = 'Query your data',
  hideSql = false,
  readOnly = false,
  runAutomatically = false,
  refetch,
  initialNaturalLanguageMode = false,
  hideChartOption = false,
}: SqlEditorProps) {
  const [sql, setSql] = useState(initialSql || '')
  const [isSqlVisible, setIsSqlVisible] = useState(!hideSql)
  const [isNaturalLanguageMode, setIsNaturalLanguageMode] = useState(
    initialNaturalLanguageMode || false
  )
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState('')
  const { mutate: runQuery, data, isPending, error } = useRunQuery()
  const [isGeneratingSql, setIsGeneratingSql] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [isChartVisible, setIsChartVisible] = useState(false)
  const [xAxisColumn, setXAxisColumn] = useState<string | null>(null)
  const [yAxisColumn, setYAxisColumn] = useState<string | null>(null)

  const columns = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return []
    if (typeof data[0] !== 'object' || data[0] === null) return []
    return Object.keys(data[0])
  }, [data])

  useEffect(() => {
    if (initialSql) {
      setSql(initialSql)
    }
  }, [initialSql])

  const handleRunNaturalLanguageQuery = async () => {
    if (!naturalLanguageQuery) return

    setIsGeneratingSql(true)
    setAiError(null)
    try {
      const response = await fetch('/api/ai/sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: naturalLanguageQuery,
          projectRef,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to generate SQL')
      }

      const { sql: generatedSql } = await response.json()
      setSql(generatedSql)
      runQuery({ projectRef, query: generatedSql, readOnly: true })
    } catch (error: any) {
      console.error(error)
      setAiError(error.message)
    } finally {
      setIsGeneratingSql(false)
    }
  }

  const handleRunQuery = useCallback(() => {
    if (sql) {
      runQuery({ projectRef, query: sql, readOnly: true })
    }
  }, [sql, projectRef, runQuery])

  useEffect(() => {
    setIsSqlVisible(!hideSql)
  }, [hideSql])

  useEffect(() => {
    if (runAutomatically && initialSql) {
      runQuery({ projectRef, query: initialSql, readOnly: true })
    }
  }, [runAutomatically, initialSql, projectRef, runQuery])

  useEffect(() => {
    if (refetch && refetch > 0) {
      handleRunQuery()
    }
  }, [refetch, handleRunQuery])

  useEffect(() => {
    if (onResults) {
      onResults(data)
    }
  }, [data, onResults])

  useEffect(() => {
    const noResults = !data || (Array.isArray(data) && data.length === 0)
    if (noResults && !isSqlVisible && !isNaturalLanguageMode && !readOnly && !isPending) {
      setIsSqlVisible(true)
    }
  }, [data, isSqlVisible, isNaturalLanguageMode])

  const serverErrorMessage = (error as any)?.response?.data?.message || ''
  const isReadOnlyError =
    serverErrorMessage.includes('permission denied') || serverErrorMessage.includes('42501')
  const customReadOnlyError = "You can't directly alter your database schema, use chat instead"

  // Build the toggle-group selection based on current UI state
  const toggleValues = useMemo(() => {
    const values: string[] = []
    if (isNaturalLanguageMode) values.push('chat')
    if (isSqlVisible) values.push('sql')
    if (!hideChartOption && isChartVisible) values.push('chart')
    return values
  }, [isNaturalLanguageMode, isSqlVisible, isChartVisible, hideChartOption])

  const handleToggleGroupChange = (values: string[]) => {
    setIsNaturalLanguageMode(values.includes('chat'))
    setIsSqlVisible(values.includes('sql'))
    if (!hideChartOption) {
      setIsChartVisible(values.includes('chart'))
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="font-semibold flex-1 text-sm">{label}</h2>
          <ToggleGroup
            type="multiple"
            size="sm"
            value={toggleValues}
            onValueChange={handleToggleGroupChange}
            className="gap-1"
          >
            {true && (
              <ToggleGroupItem value="chat" aria-label="Chat" className="h-7 w-7 p-0">
                <Wand className="h-3 w-3" />
              </ToggleGroupItem>
            )}
            <ToggleGroupItem value="sql" aria-label="SQL" className="h-7 w-7 p-0">
              <FileText className="h-3 w-3" />
            </ToggleGroupItem>
            {!hideChartOption && (
              <Popover>
                <PopoverTrigger asChild>
                  <ToggleGroupItem value="chart" aria-label="Chart" className="h-7 w-7 p-0">
                    <BarChartIcon className="h-3 w-3" />
                  </ToggleGroupItem>
                </PopoverTrigger>
                <PopoverContent className="w-72">
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <Label className="flex-1 mb-1 block text-xs">Show Chart</Label>
                          <p className="text-xs text-muted-foreground">
                            Visualize your data with a chart.
                          </p>
                        </div>
                        <Switch
                          id="show-chart"
                          size="sm"
                          checked={isChartVisible}
                          onCheckedChange={setIsChartVisible}
                        />
                      </div>
                      {isChartVisible && (
                        <div className="mt-2 space-y-2">
                          <div className="grid grid-cols-3 items-center gap-2">
                            <Label htmlFor="x-axis" className="text-xs">X-Axis</Label>
                            <Select
                              onValueChange={setXAxisColumn}
                              defaultValue={xAxisColumn || undefined}
                            >
                              <SelectTrigger className="col-span-2 h-7 text-xs">
                                <SelectValue placeholder="Select column" />
                              </SelectTrigger>
                              <SelectContent>
                                {columns.map((col) => (
                                  <SelectItem key={col} value={col} className="text-xs">
                                    {col}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-3 items-center gap-2">
                            <Label htmlFor="y-axis" className="text-xs">Y-Axis</Label>
                            <Select
                              onValueChange={setYAxisColumn}
                              defaultValue={yAxisColumn || undefined}
                            >
                              <SelectTrigger className="col-span-2 h-7 text-xs">
                                <SelectValue placeholder="Select column" />
                              </SelectTrigger>
                              <SelectContent>
                                {columns.map((col) => (
                                  <SelectItem key={col} value={col} className="text-xs">
                                    {col}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </ToggleGroup>
        </div>
      </div>
      
      <div className="flex-1 px-4 pb-4 min-h-0 overflow-hidden">
        {isNaturalLanguageMode && (
          <div className="relative mb-3">
            <Wand
              strokeWidth={1.5}
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
            />
            <Input
              placeholder="e.g. Show me all users who signed up in the last 7 days"
              value={naturalLanguageQuery}
              onChange={(e) => setNaturalLanguageQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleRunNaturalLanguageQuery()
                }
              }}
              className="w-full px-8 text-xs h-8"
            />
            <Button
              onClick={handleRunNaturalLanguageQuery}
              disabled={isGeneratingSql || isPending}
              size="sm"
              className="h-6 w-6 rounded-full p-0 shrink-0 absolute right-1 top-1/2 -translate-y-1/2"
            >
              {isGeneratingSql ? (
                <Loader2 size={12} className="animate-spin" />
              ) : isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <ArrowUp size={12} />
              )}
            </Button>
          </div>
        )}
        
        {isSqlVisible && (
          <div className="border rounded-md bg-muted overflow-hidden mb-3 relative">
            <Editor
              height="120px"
              language="sql"
              value={sql}
              onChange={(value) => setSql(value || '')}
              theme="vs-dark"
              className="bg-transparent"
              options={{
                minimap: { enabled: false },
                fontSize: 11,
                readOnly,
                padding: {
                  top: 12,
                  bottom: 12,
                },
              }}
            />
            <Button
              size="sm"
              onClick={handleRunQuery}
              disabled={isPending}
              className="absolute bottom-2 right-2 text-xs h-6"
            >
              {isPending ? 'Running...' : 'Run'}
            </Button>
          </div>
        )}
        {isPending && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        )}
        
        {aiError && (
          <div className="mb-3">
            <Alert variant="destructive">
              <AlertTriangle className="h-3 w-3" />
              <AlertTitle className="text-xs">Error generating SQL</AlertTitle>
              <AlertDescription className="text-xs">{aiError}</AlertDescription>
            </Alert>
          </div>
        )}
        
        {error && (
          <div className="mb-3">
            <Alert variant="destructive">
              <AlertTriangle className="h-3 w-3" />
              <AlertTitle className="text-xs">Query Error</AlertTitle>
              <AlertDescription className="text-xs">
                {isReadOnlyError
                  ? customReadOnlyError
                  : serverErrorMessage || (error as Error)?.message || 'An unexpected error occurred'}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {!hideChartOption && data && isChartVisible && xAxisColumn && yAxisColumn && (
          <div className="mb-3">
            <QueryResultChart data={data} xAxis={xAxisColumn} yAxis={yAxisColumn} />
          </div>
        )}

        {data && (
          <div className="flex-1 min-h-0">
            <ResultsTable data={data} onRowClick={(row) => onRowClick?.(row, queryKey)} />
          </div>
        )}
      </div>
    </div>
  )
}

function QueryResultChart({ data, xAxis, yAxis }: { data: any[]; xAxis: string; yAxis: string }) {
  const chartConfig = {
    [yAxis]: {
      label: yAxis,
      color: 'var(--chart-1)',
    },
  } satisfies ChartConfig

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
      <BarChart
        accessibilityLayer
        data={data}
        margin={{
          left: -16,
          right: 8,
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis 
          dataKey={xAxis} 
          tickLine={false} 
          axisLine={false} 
          tickMargin={6} 
          minTickGap={24}
          fontSize={10}
        />
        <YAxis
          dataKey={yAxis}
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          tickCount={4}
          allowDecimals={false}
          fontSize={10}
        />
        <ChartTooltip content={<ChartTooltipContent className="w-[120px]" indicator="dot" />} />
        <Bar dataKey={yAxis} fill={`var(--color-${yAxis})`} />
      </BarChart>
    </ChartContainer>
  )
}
