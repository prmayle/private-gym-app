"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/AuthContext"
import { createClient } from "@/utils/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, TrendingUp } from "lucide-react"

// Helper function to format dates
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// Helper function to calculate change
const calculateChange = (data: any[]) => {
  if (data.length < 2) return { value: 0, isPositive: true }

  const latest = data[data.length - 1].value
  const previous = data[data.length - 2].value
  const change = latest - previous

  return {
    value: Math.abs(change).toFixed(1),
    isPositive: change >= 0,
  }
}

// Simple chart component using divs
const SimpleChart = ({ data, unit, decreaseIsGood = false }: { data: any[], unit: string, decreaseIsGood?: boolean }) => {
  const maxValue = Math.max(...data.map((item: any) => item.value)) * 1.1
  const minValue = Math.min(...data.map((item: any) => item.value)) * 0.9

  return (
    <div className="h-40 flex items-end space-x-2">
      {data.map((item: any, index: number) => {
        const height = ((item.value - minValue) / (maxValue - minValue)) * 100
        const isLatest = index === data.length - 1

        return (
          <div key={index} className="flex flex-col items-center flex-1">
            <div className="w-full flex justify-center mb-1">
              <div
                className={`w-full max-w-[30px] rounded-t-sm ${isLatest ? "bg-primary" : "bg-primary/30"}`}
                style={{ height: `${height}%` }}
              ></div>
            </div>
            <div className="text-xs text-muted-foreground">{formatDate(item.date)}</div>
            {isLatest && (
              <div className="text-xs font-medium mt-1">
                {item.value} {unit}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Measurement table component
const MeasurementTable = ({ data }: { data: any }) => {
  // Filter out empty measurement arrays
  const availableMeasurements = Object.entries(data).filter(([key, values]: [string, any]) => (values as any).length > 0)
  
  if (availableMeasurements.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No measurements available</p>
      </div>
    )
  }

  // Get all unique dates across all measurements
  const allDates = [...new Set(
    availableMeasurements.flatMap(([key, values]) => values.map(item => item.date))
  )].sort()

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Measurement</th>
            {allDates.map((date, index) => (
              <th key={index} className="text-center py-2">
                {formatDate(date)}
              </th>
            ))}
            <th className="text-center py-2">Change</th>
          </tr>
        </thead>
        <tbody>
          {availableMeasurements.map(([key, values]) => {
            const firstValue = values[0]?.value
            const lastValue = values[values.length - 1]?.value
            const change = lastValue && firstValue ? lastValue - firstValue : 0
            const isPositive = change >= 0

            return (
              <tr key={key} className="border-b">
                <td className="py-2 capitalize">{key}</td>
                {allDates.map((date, index) => {
                  const measurement = values.find(item => item.date === date)
                  return (
                    <td key={index} className="text-center py-2">
                      {measurement ? `${measurement.value} cm` : '-'}
                    </td>
                  )
                })}
                <td className="text-center py-2">
                  {values.length > 1 ? (
                    <span className={isPositive ? "text-green-500" : "text-red-500"}>
                      {isPositive ? "+" : "-"}
                      {Math.abs(change)} cm
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function ProgressPage() {
  const router = useRouter()
  const auth = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("overview")
  const [progressData, setProgressData] = useState<any>({
    weight: [],
    bodyFat: [],
    muscleMass: [],
    measurements: {
      chest: [],
      waist: [],
      hips: [],
      arms: [],
      thighs: [],
    }
  })
  const [loading, setLoading] = useState(true)
  const [trainerNotes, setTrainerNotes] = useState("")

  useEffect(() => {
    if (auth.user) {
      loadProgressData()
    }
  }, [auth.user])

  const loadProgressData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      if (!auth.user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view your progress.",
          variant: "destructive",
        })
        return
      }

      // Get member profile
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', auth.user.id)
        .single()

      if (memberError || !memberData) {
        toast({
          title: "Member Profile Not Found",
          description: "Please contact admin to set up your member profile.",
          variant: "destructive",
        })
        return
      }

      // Load progress tracking data
      const { data: progressTrackingData, error: progressError } = await supabase
        .from('progress_tracking')
        .select('*')
        .eq('member_id', memberData.id)
        .order('measurement_date', { ascending: true })

      if (progressError) {
        console.error("Error loading progress data:", progressError)
        toast({
          title: "Error Loading Progress",
          description: "Failed to load progress data. Please try again.",
          variant: "destructive",
        })
        return
      }

      if (!progressTrackingData || progressTrackingData.length === 0) {
        // Set empty state
        setProgressData({
          weight: [],
          bodyFat: [],
          muscleMass: [],
          measurements: {
            chest: [],
            waist: [],
            hips: [],
            arms: [],
            thighs: [],
          }
        })
        setLoading(false)
        return
      }

      // Transform the data into the format expected by the UI
      const transformedData = {
        weight: progressTrackingData
          .filter(item => item.weight !== null)
          .map(item => ({
            date: item.measurement_date,
            value: item.weight
          })),
        bodyFat: progressTrackingData
          .filter(item => item.body_fat_percentage !== null)
          .map(item => ({
            date: item.measurement_date,
            value: item.body_fat_percentage
          })),
        muscleMass: progressTrackingData
          .filter(item => item.muscle_mass !== null)
          .map(item => ({
            date: item.measurement_date,
            value: item.muscle_mass
          })),
        measurements: {
          chest: progressTrackingData
            .filter(item => item.chest_measurement !== null)
            .map(item => ({
              date: item.measurement_date,
              value: item.chest_measurement
            })),
          waist: progressTrackingData
            .filter(item => item.waist_measurement !== null)
            .map(item => ({
              date: item.measurement_date,
              value: item.waist_measurement
            })),
          hips: progressTrackingData
            .filter(item => item.hip_measurement !== null)
            .map(item => ({
              date: item.measurement_date,
              value: item.hip_measurement
            })),
          arms: progressTrackingData
            .filter(item => item.arm_measurement !== null)
            .map(item => ({
              date: item.measurement_date,
              value: item.arm_measurement
            })),
          thighs: progressTrackingData
            .filter(item => item.thigh_measurement !== null)
            .map(item => ({
              date: item.measurement_date,
              value: item.thigh_measurement
            })),
        }
      }

      setProgressData(transformedData)

      // Get latest trainer notes if available
      const latestRecord = progressTrackingData[progressTrackingData.length - 1]
      if (latestRecord && latestRecord.notes) {
        setTrainerNotes(latestRecord.notes)
      }

    } catch (error) {
      console.error("Error loading progress data:", error)
      toast({
        title: "Error Loading Progress",
        description: "Failed to load progress data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Calculate changes for metrics
  const weightChange = calculateChange(progressData.weight)
  const bodyFatChange = calculateChange(progressData.bodyFat)
  const muscleMassChange = calculateChange(progressData.muscleMass)

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Your Progress</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const hasData = progressData.weight.length > 0 || progressData.bodyFat.length > 0 || progressData.muscleMass.length > 0

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2" aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Your Progress</h1>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="text-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Progress Data Yet</h3>
            <p className="text-muted-foreground mb-4">
              Your trainer will add progress measurements during your sessions.
            </p>
            <p className="text-sm text-muted-foreground">
              Progress tracking includes weight, body fat percentage, muscle mass, and body measurements.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Weight Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Weight</CardTitle>
                <CardDescription>
                  {progressData.weight.length > 0 
                    ? `Current: ${progressData.weight[progressData.weight.length - 1].value} kg`
                    : "No data recorded"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {progressData.weight.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-muted-foreground">Progress</span>
                      <span className={`text-sm font-medium ${weightChange.isPositive ? "text-green-500" : "text-red-500"}`}>
                        {weightChange.isPositive ? "+" : "-"}
                        {weightChange.value} kg
                      </span>
                    </div>
                    <SimpleChart data={progressData.weight} unit="kg" decreaseIsGood={true} />
                  </>
                ) : (
                  <div className="h-32 flex items-center justify-center text-muted-foreground">
                    No weight data recorded
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Body Fat Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Body Fat</CardTitle>
                <CardDescription>
                  {progressData.bodyFat.length > 0 
                    ? `Current: ${progressData.bodyFat[progressData.bodyFat.length - 1].value}%`
                    : "No data recorded"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {progressData.bodyFat.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-muted-foreground">Progress</span>
                      <span className={`text-sm font-medium ${!bodyFatChange.isPositive ? "text-green-500" : "text-red-500"}`}>
                        {bodyFatChange.isPositive ? "+" : "-"}
                        {bodyFatChange.value}%
                      </span>
                    </div>
                    <SimpleChart data={progressData.bodyFat} unit="%" decreaseIsGood={true} />
                  </>
                ) : (
                  <div className="h-32 flex items-center justify-center text-muted-foreground">
                    No body fat data recorded
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Muscle Mass Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Muscle Mass</CardTitle>
                <CardDescription>
                  {progressData.muscleMass.length > 0 
                    ? `Current: ${progressData.muscleMass[progressData.muscleMass.length - 1].value} kg`
                    : "No data recorded"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {progressData.muscleMass.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-muted-foreground">Progress</span>
                      <span
                        className={`text-sm font-medium ${muscleMassChange.isPositive ? "text-green-500" : "text-red-500"}`}
                      >
                        {muscleMassChange.isPositive ? "+" : "-"}
                        {muscleMassChange.value} kg
                      </span>
                    </div>
                    <SimpleChart data={progressData.muscleMass} unit="kg" />
                  </>
                ) : (
                  <div className="h-32 flex items-center justify-center text-muted-foreground">
                    No muscle mass data recorded
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="measurements">Measurements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Progress Summary</CardTitle>
              <CardDescription>Your fitness journey at a glance</CardDescription>
            </CardHeader>
            <CardContent>
              {hasData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Starting Weight</h3>
                      {progressData.weight.length > 0 ? (
                        <>
                          <p className="text-2xl font-bold">{progressData.weight[0].value} kg</p>
                          <p className="text-xs text-muted-foreground">{formatDate(progressData.weight[0].date)}</p>
                        </>
                      ) : (
                        <p className="text-muted-foreground">No data</p>
                      )}
                    </div>
                    <div className="border rounded-lg p-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Current Weight</h3>
                      {progressData.weight.length > 0 ? (
                        <>
                          <p className="text-2xl font-bold">{progressData.weight[progressData.weight.length - 1].value} kg</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(progressData.weight[progressData.weight.length - 1].date)}
                          </p>
                        </>
                      ) : (
                        <p className="text-muted-foreground">No data</p>
                      )}
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h3 className="text-sm font-medium mb-2">Total Progress</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Weight</span>
                        <span className="text-sm font-medium">
                          {progressData.weight.length > 1 ? (
                            `${(progressData.weight[progressData.weight.length - 1].value - progressData.weight[0].value).toFixed(1)} kg`
                          ) : (
                            "Insufficient data"
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Body Fat</span>
                        <span className="text-sm font-medium">
                          {progressData.bodyFat.length > 1 ? (
                            `${(progressData.bodyFat[progressData.bodyFat.length - 1].value - progressData.bodyFat[0].value).toFixed(1)}%`
                          ) : (
                            "Insufficient data"
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Muscle Mass</span>
                        <span className="text-sm font-medium">
                          {progressData.muscleMass.length > 1 ? (
                            `${(progressData.muscleMass[progressData.muscleMass.length - 1].value - progressData.muscleMass[0].value).toFixed(1)} kg`
                          ) : (
                            "Insufficient data"
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h3 className="text-sm font-medium mb-2">Trainer Notes</h3>
                    <p className="text-sm text-muted-foreground">
                      {trainerNotes || "No trainer notes available yet. Your trainer will add notes during progress assessments."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No progress data available to display summary.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="measurements">
          <Card>
            <CardHeader>
              <CardTitle>Body Measurements</CardTitle>
              <CardDescription>Detailed measurements over time</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.values(progressData.measurements).some(measurements => measurements.length > 0) ? (
                <MeasurementTable data={progressData.measurements} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No body measurements recorded yet.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Your trainer will record detailed measurements during assessments.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </>
      )}
    </div>
  )
}
