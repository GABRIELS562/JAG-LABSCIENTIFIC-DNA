import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const LabCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    { 
      src: "/carousel1.jpg",
      alt: "DNA Analysis Lab",
      caption: "State-of-the-art DNA Analysis"
    },
    { 
      src: "/carousel2.jpg",
      alt: "Laboratory Equipment",
      caption: "Advanced Laboratory Equipment"
    },
    { 
      src: "/carousel3.jpg",
      alt: "Research Team",
      caption: "Expert Research Team"
    },
    { 
      src: "/carousel4.jpg",
      alt: "DNA Sequencing",
      caption: "Precision DNA Sequencing"
    },
    { 
      src: "/carousel5.jpg",
      alt: "Sample Processing",
      caption: "Advanced Sample Processing"
    },
    { 
      src: "/carousel6.jpg",
      alt: "Quality Control",
      caption: "Rigorous Quality Control"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: '1100px', // Reduced from 1200px
        margin: 'auto',
        aspectRatio: '16/9', // Maintain aspect ratio
        overflow: 'hidden',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          transition: 'transform 0.5s ease-in-out',
          transform: `translateX(-${currentSlide * 100}%)`,
          height: '100%',
        }}
      >
        {slides.map((slide, index) => (
          <Box
            key={index}
            sx={{
              minWidth: '100%',
              height: '100%',
              position: 'relative',
            }}
          >
            <img
              src={slide.src}
              alt={slide.alt}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '20px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                color: 'white',
                textAlign: 'center',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '500' }}>{slide.caption}</h3>
            </Box>
          </Box>
        ))}
      </Box>

      <button
        onClick={prevSlide}
        style={{
          position: 'absolute',
          left: '20px',
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      >
        <ChevronLeft />
      </button>

      <button
        onClick={nextSlide}
        style={{
          position: 'absolute',
          right: '20px',
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      >
        <ChevronRight />
      </button>

      <Box
        sx={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px',
          zIndex: 2,
        }}
      >
        {slides.map((_, index) => (
          <Box
            key={index}
            onClick={() => setCurrentSlide(index)}
            sx={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: currentSlide === index ? 'white' : 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: 'white',
                transform: 'scale(1.2)',
              },
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default LabCarousel;