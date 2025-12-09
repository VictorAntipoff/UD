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
 * Optimized for LCD/LED 7-segment displays
 */
async function extractTextFromImage(imageBuffer: Buffer): Promise<OCRResult> {
  let worker;
  try {
    // Aggressive preprocessing for LCD displays
    const processedBuffer = await preprocessImageForLCD(imageBuffer);

    // Create worker and configure for LCD displays
    worker = await Tesseract.createWorker('eng', undefined, {
      logger: (info) => {
        if (info.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(info.progress * 100)}%`);
        }
      }
    });

    // Set Tesseract parameters optimized for LED/LCD displays
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789.:%/',
      tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
      preserve_interword_spaces: '0'
    });

    // Perform OCR
    const result = await worker.recognize(processedBuffer);

    console.log('OCR Raw Result:', result.data.text);
    console.log('OCR Confidence:', result.data.confidence);

    await worker.terminate();

    return {
      text: result.data.text,
      confidence: result.data.confidence
    };
  } catch (error) {
    if (worker) {
      await worker.terminate();
    }
    console.error('Error extracting text from image:', error);
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Aggressive preprocessing specifically for LCD/LED displays
 */
async function preprocessImageForLCD(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    // Multi-stage processing for LCD displays
    let processed = image
      .greyscale()
      // Stage 1: Increase contrast dramatically
      .linear(2.0, -(128 * 1.0))
      // Stage 2: Apply threshold to get pure black/white
      .threshold(128)
      // Stage 3: Sharpen edges
      .sharpen({ sigma: 3 })
      // Stage 4: Scale up for better recognition
      .resize(metadata.width && metadata.width < 1200 ? 1200 : metadata.width, null, {
        kernel: 'lanczos3',
        fit: 'inside'
      });

    return await processed.toBuffer();
  } catch (error) {
    console.error('Error preprocessing LCD image:', error);
    return imageBuffer;
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
 * Handles OCR errors where decimals are missed (309 → 30.9)
 * Looks for patterns like: "34.3%", "15.5 %", "309%" (missed decimal)
 */
function extractHumidityPercentage(text: string): number | null {
  console.log('🔍 Extracting humidity from OCR text:', text);

  // Look for decimal number followed by % (e.g., 34.3%)
  const decimalPercentMatch = text.match(/(\d+\.\d+)\s*%/);
  if (decimalPercentMatch) {
    const value = parseFloat(decimalPercentMatch[1]);
    console.log('✅ Found decimal with %:', value);
    if (value >= 0 && value <= 100) {
      return value;
    }
  }

  // Look for 3-digit numbers with % (OCR often misses decimal: 309% → 30.9%)
  const threeDigitMatch = text.match(/(\d{3})\s*%/);
  if (threeDigitMatch) {
    const digits = threeDigitMatch[1];
    // Insert decimal point: 309 → 30.9
    const value = parseFloat(digits[0] + digits[1] + '.' + digits[2]);
    console.log('✅ Found 3-digit with % (inserting decimal):', digits, '→', value);
    if (value >= 10 && value <= 100) {
      return value;
    }
  }

  // Look for 2-digit numbers with % (e.g., 34%)
  const twoDigitMatch = text.match(/(\d{2})\s*%/);
  if (twoDigitMatch) {
    const value = parseFloat(twoDigitMatch[1]);
    console.log('✅ Found 2-digit with %:', value);
    if (value >= 10 && value <= 100) {
      return value;
    }
  }

  // Look for any number followed by %
  const percentMatch = text.match(/(\d+\.?\d*)\s*%/);
  if (percentMatch) {
    const value = parseFloat(percentMatch[1]);
    console.log('Found number with %:', value);
    if (value >= 0 && value <= 100) {
      return value;
    }
  }

  // Look for "humidity" keyword followed by number
  const humidityMatch = text.match(/humidity[:\s]+(\d+\.?\d*)/i);
  if (humidityMatch) {
    const value = parseFloat(humidityMatch[1]);
    console.log('Found with humidity keyword:', value);
    if (value >= 0 && value <= 100) {
      return value;
    }
  }

  console.log('❌ No humidity value found');
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
  // Common formats: MM/DD/YYYY HH:MM (US format)
  console.log('🔍 Looking for date/time in OCR text:', ocrText);

  const datePatterns = [
    /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/,  // 2025-01-06 14:30 (ISO)
    /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/, // 12/09/2025 14:30 (MM/DD/YYYY)
    /(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})/   // 12-09-2025 14:30
  ];

  for (let i = 0; i < datePatterns.length; i++) {
    const pattern = datePatterns[i];
    const match = ocrText.match(pattern);
    if (match) {
      try {
        let date: Date;

        // Pattern index 1 is MM/DD/YYYY format (12/09/2025 16:02)
        if (i === 1) {
          const [, month, day, year, hour, minute] = match;
          console.log('✅ Found MM/DD/YYYY date:', `${month}/${day}/${year} ${hour}:${minute}`);
          // Construct date as YYYY-MM-DD HH:MM for proper parsing
          date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
        } else if (i === 2) {
          // Pattern 2 is MM-DD-YYYY
          const [, month, day, year, hour, minute] = match;
          console.log('✅ Found MM-DD-YYYY date:', `${month}-${day}-${year} ${hour}:${minute}`);
          date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
        } else {
          // Other patterns can be parsed directly
          const dateStr = match[0];
          console.log('✅ Found date (direct parse):', dateStr);
          date = new Date(dateStr);
        }

        if (!isNaN(date.getTime())) {
          console.log('✅ Successfully parsed date:', date.toISOString());
          return date;
        }
      } catch (error) {
        console.log('❌ Failed to parse date pattern', i);
        continue;
      }
    }
  }

  console.log('❌ No date/time found in OCR text');

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
