import { useState } from 'react'
import './App.css'

interface AppProps {
  apiKey: string
  apiUrl?: string
}

function App({ apiKey, apiUrl = 'http://localhost:3001' }: AppProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [garmentImage, setGarmentImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)

  const handlePersonImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0])
    }
  }

  const handleGarmentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setGarmentImage(e.target.files[0])
    }
  }

  const handleTryOn = async () => {
    if (!selectedImage || !garmentImage) {
      alert('Please select both a person image and a garment image')
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('personImage', selectedImage)
    formData.append('garmentImage', garmentImage)

    try {
      const response = await fetch(`${apiUrl}/api/try-on`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('Try-on request failed')
      }

      const data = await response.json()
      setResultUrl(data.resultUrl)
    } catch (error) {
      console.error('Error during try-on:', error)
      alert('Failed to process try-on request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="widget-container">
      <h2>Virtual Try-On</h2>

      <div className="upload-section">
        <div className="upload-box">
          <label htmlFor="person-upload">Upload Your Photo</label>
          <input
            id="person-upload"
            type="file"
            accept="image/*"
            onChange={handlePersonImageChange}
          />
          {selectedImage && <p>Selected: {selectedImage.name}</p>}
        </div>

        <div className="upload-box">
          <label htmlFor="garment-upload">Select Garment</label>
          <input
            id="garment-upload"
            type="file"
            accept="image/*"
            onChange={handleGarmentImageChange}
          />
          {garmentImage && <p>Selected: {garmentImage.name}</p>}
        </div>
      </div>

      <button
        onClick={handleTryOn}
        disabled={loading || !selectedImage || !garmentImage}
        className="try-on-button"
      >
        {loading ? 'Processing...' : 'Try On'}
      </button>

      {resultUrl && (
        <div className="result-section">
          <h3>Result</h3>
          <img src={resultUrl} alt="Try-on result" />
        </div>
      )}
    </div>
  )
}

export default App
