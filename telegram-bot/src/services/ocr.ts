import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { CONFIG } from '../config';

export interface OCRResult {
  text: string;
  confidence: number;
  value?: number;
  timestamp?: Date;
}

export interface MeterReading {
  value: number;
  confidence: number;
  rawText: string;
}

export interface HumidityReading {
  humidity: number;
  confidence: number;
  timestamp?: Date;
  rawText: string;
}

/**
 * Preprocess image for better OCR accuracy
 */
async function preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // Enhance image for OCR (optimized for LCD/LED displays):
    // - Convert to grayscale
    // - Increase contrast significantly
    // - Apply threshold for better digit clarity
    // - Sharpen
    // - Resize if needed
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    let processedImage = image
      .grayscale()
      .normalize() // Auto-adjust contrast
      .linear(1.5, -(128 * 0.5)) // Increase contrast more aggressively
      .sharpen({ sigma: 2 }); // More aggressive sharpening

    // Resize if too small (improves OCR accuracy)
    const targetWidth = metadata.width && metadata.width < 800 ? 800 : metadata.width;
    if (metadata.width && metadata.width < 800) {
      processedImage = processedImage.resize(targetWidth, null, {
        fit: 'inside',
        kernel: 'lanczos3'
      });
    }

    return await processedImage.toBuffer();
  } catch (error) {
    console.error('Error preprocessing image:', error);
    // Return original if preprocessing fails
    return imageBuffer;
  }
}

/**
 * Extract text from image using Tesseract OCR
 */
async function extractTextFromImage(imageBuffer: Buffer): Promise<OCRResult> {
  try {
    // Preprocess image
    const processedBuffer = await preprocessImage(imageBuffer);

    // Perform OCR
    const result = await Tesseract.recognize(
      processedBuffer,
      'eng', // English language
      {
        logger: (info) => {
          if (info.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(info.progress * 100)}%`);
          }
        }
      }
    );

    return {
      text: result.data.text,
      confidence: result.data.confidence
    };
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Extract numeric value from OCR text
 * Prioritizes numbers with decimal points (more likely to be meter readings)
 * Handles various formats:
 * - "12.5" → 12.5
 * - "12,5" → 12.5
 * - "12.5 kWh" → 12.5
 * - "Value: 12.5" → 12.5
 */
function extractNumericValue(text: string): number | null {
  // Look for numbers with decimal points first (e.g., 1658.97)
  const decimalPattern = /\d+[.,]\d+/g;
  const decimalMatches = text.match(decimalPattern);

  if (decimalMatches && decimalMatches.length > 0) {
    // Take the first decimal number found (usually the main reading)
    const value = parseFloat(decimalMatches[0].replace(',', '.'));
    if (!isNaN(value)) {
      return value;
    }
  }

  // Fallback: look for any numbers
  const allNumbers = text.match(/\d+/g);

  if (!allNumbers || allNumbers.length === 0) {
    return null;
  }

  // Take the first number found (usually at the top of the display)
  const value = parseFloat(allNumbers[0]);

  return isNaN(value) ? null : value;
}

/**
 * Extract humidity percentage from text
 * Prioritizes decimal numbers with % symbol
 * Looks for patterns like: "34.3%", "15.5 %", "Humidity: 15.5"
 */
function extractHumidityPercentage(text: string): number | null {
  // Look for decimal number followed by % (e.g., 34.3%)
  const decimalPercentMatch = text.match(/(\d+\.\d+)\s*%/);
  if (decimalPercentMatch) {
    const value = parseFloat(decimalPercentMatch[1]);
    if (value >= 0 && value <= 100) {
      return value;
    }
  }

  // Look for any number followed by % or "percent"
  const percentMatch = text.match(/(\d+\.?\d*)\s*%/);
  if (percentMatch) {
    const value = parseFloat(percentMatch[1]);
    if (value >= 0 && value <= 100) {
      return value;
    }
  }

  // Look for "humidity" keyword followed by number
  const humidityMatch = text.match(/humidity[:\s]+(\d+\.?\d*)/i);
  if (humidityMatch) {
    const value = parseFloat(humidityMatch[1]);
    if (value >= 0 && value <= 100) {
      return value;
    }
  }

  // Fallback: extract any number between 0-100
  const value = extractNumericValue(text);
  if (value !== null && value >= 0 && value <= 100) {
    return value;
  }

  return null;
}

/**
 * Extract timestamp from image EXIF data or OCR text
 */
async function extractTimestamp(imageBuffer: Buffer, ocrText: string): Promise<Date | null> {
  try {
    // First, try to get timestamp from EXIF data
    const metadata = await sharp(imageBuffer).metadata();

    if (metadata.exif) {
      // Parse EXIF data for DateTime
      const exifBuffer = metadata.exif;
      const exifString = exifBuffer.toString('utf-8');

      // Look for DateTime in EXIF
      const dateTimeMatch = exifString.match(/DateTime\0(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
      if (dateTimeMatch) {
        const [, year, month, day, hour, minute, second] = dateTimeMatch;
        return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
      }
    }
  } catch (error) {
    console.log('Could not extract EXIF timestamp:', error);
  }

  // Fallback: try to extract date/time from OCR text
  // Common formats: "2025-01-06 14:30", "06/01/2025 14:30", "Jan 6, 2025"
  const datePatterns = [
    /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/,  // 2025-01-06 14:30
    /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/, // 06/01/2025 14:30
    /(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})/   // 06-01-2025 14:30
  ];

  for (let i = 0; i < datePatterns.length; i++) {
    const pattern = datePatterns[i];
    const match = ocrText.match(pattern);
    if (match) {
      try {
        let date: Date;

        // Pattern index 1 is DD/MM/YYYY format (12/07/2025 16:02)
        if (i === 1) {
          const [, day, month, year, hour, minute] = match;
          // Construct date as YYYY-MM-DD HH:MM for proper parsing
          date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
        } else {
          // Other patterns can be parsed directly
          const dateStr = match[0];
          date = new Date(dateStr);
        }

        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch (error) {
        continue;
      }
    }
  }

  return null;
}

/**
 * Process Luku/electricity meter image
 * Extracts meter reading (kWh value)
 */
export async function processLukuMeter(imageBuffer: Buffer): Promise<MeterReading> {
  const ocrResult = await extractTextFromImage(imageBuffer);
  const value = extractNumericValue(ocrResult.text);

  if (value === null) {
    throw new Error('Could not extract meter reading from image. Please try again with a clearer photo.');
  }

  // Validate reading is reasonable (0-999999 kWh)
  if (value < 0 || value > 999999) {
    throw new Error(`Invalid meter reading: ${value}. Expected value between 0-999999 kWh.`);
  }

  return {
    value,
    confidence: ocrResult.confidence,
    rawText: ocrResult.text
  };
}

/**
 * Process humidity meter image
 * Extracts humidity percentage and timestamp
 */
export async function processHumidityMeter(imageBuffer: Buffer): Promise<HumidityReading> {
  const ocrResult = await extractTextFromImage(imageBuffer);

  // Log OCR result for debugging
  console.log('=== HUMIDITY OCR DEBUG ===');
  console.log('Raw OCR text:', ocrResult.text);
  console.log('OCR confidence:', ocrResult.confidence);

  let humidity = extractHumidityPercentage(ocrResult.text);

  // If no humidity with % found, try to extract any decimal number between 0-100
  if (humidity === null) {
    console.log('No % found, trying to extract any number between 0-100');
    const allNumbers = ocrResult.text.match(/\d+\.?\d*/g);
    console.log('All numbers found:', allNumbers);

    if (allNumbers) {
      for (const num of allNumbers) {
        const value = parseFloat(num);
        if (value >= 0 && value <= 100) {
          console.log('Found valid humidity candidate:', value);
          humidity = value;
          break;
        }
      }
    }
  }

  const timestamp = await extractTimestamp(imageBuffer, ocrResult.text);

  if (humidity === null) {
    throw new Error(`Could not extract humidity reading.\n\nOCR found: "${ocrResult.text.substring(0, 100)}"\n\nPlease try again with a clearer photo.`);
  }

  // Validate humidity is in reasonable range
  if (humidity < 0 || humidity > 100) {
    throw new Error(`Invalid humidity reading: ${humidity}%. Expected value between 0-100%.`);
  }

  console.log('Final humidity extracted:', humidity);
  console.log('Timestamp extracted:', timestamp);

  // Check if reading is below OCR confidence threshold
  if (ocrResult.confidence < CONFIG.OCR_CONFIDENCE_THRESHOLD) {
    console.warn(`Low OCR confidence: ${ocrResult.confidence}% (threshold: ${CONFIG.OCR_CONFIDENCE_THRESHOLD}%)`);
  }

  return {
    humidity,
    confidence: ocrResult.confidence,
    timestamp: timestamp || undefined,
    rawText: ocrResult.text
  };
}

/**
 * Validate OCR result confidence
 */
export function isConfidenceAcceptable(confidence: number): boolean {
  return confidence >= CONFIG.OCR_CONFIDENCE_THRESHOLD;
}

/**
 * Format OCR confidence for display
 */
export function formatConfidence(confidence: number): string {
  if (confidence >= 90) return '✅ Excellent';
  if (confidence >= 75) return '✓ Good';
  if (confidence >= 60) return '⚠️ Fair';
  return '⚠️ Low';
}
