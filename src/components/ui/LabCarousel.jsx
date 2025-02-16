import { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Carousel } from 'react-responsive-carousel';
import "react-responsive-carousel/lib/styles/carousel.min.css";

const carouselData = [
  {
    src: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?q=80',
    backupSrc: 'https://images.unsplash.com/photo-1614935151651-0bea6508db6b?q=80',
    alt: "DNA sequence analysis and testing equipment",
    title: "DNA Analysis"
  },
  {
    src: 'https://images.unsplash.com/photo-1579154204914-ae2f51c3bd3a?q=80',
    backupSrc: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80',
    alt: "Modern laboratory testing facility",
    title: "Modern Lab"
  },
  {
    src: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?q=80',
    backupSrc: 'https://images.unsplash.com/photo-1581093057189-9f03c3875209?q=80',
    alt: "Medical research laboratory with advanced equipment",
    title: "Research Lab"
  },
  {
    src: 'https://images.unsplash.com/photo-1582560474992-385ebb8d81ce?q=80',
    backupSrc: 'https://images.unsplash.com/photo-1581093450021-4a7360e9a6b5?q=80',
    alt: "Professional lab technician conducting tests",
    title: "Lab Testing"
  },
  {
    src: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?q=80',
    backupSrc: 'https://images.unsplash.com/photo-1631556097152-c39479bbff91?q=80',
    alt: "DNA molecular structure and genetic testing",
    title: "DNA Structure"
  },
  {
    src: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80',
    backupSrc: 'https://images.unsplash.com/photo-1581093057762-2716c9e9f39a?q=80',
    alt: "State-of-the-art laboratory equipment",
    title: "Lab Equipment"
  }
];

// Additional backup images if needed
const fallbackImages = [
  'https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80',
  'https://images.unsplash.com/photo-1581093057189-9f03c3875209?q=80',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80'
];

function LabCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(new Array(carouselData.length).fill(false));
  const [imageErrors, setImageErrors] = useState(new Array(carouselData.length).fill(false));
  const [usedBackupImage, setUsedBackupImage] = useState(new Array(carouselData.length).fill(false));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % carouselData.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const handleImageLoad = (index) => {
    setImagesLoaded(prev => {
      const newState = [...prev];
      newState[index] = true;
      return newState;
    });
  };

  const handleImageError = (index) => {
    if (!usedBackupImage[index] && carouselData[index].backupSrc) {
      // Try backup image
      setUsedBackupImage(prev => {
        const newState = [...prev];
        newState[index] = true;
        return newState;
      });
    } else {
      // If backup also failed or no backup exists
      setImageErrors(prev => {
        const newState = [...prev];
        newState[index] = true;
        return newState;
      });
    }
  };

  const getImageSource = (item, index) => {
    if (usedBackupImage[index]) {
      return item.backupSrc;
    }
    return item.src;
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
      <Carousel
        showArrows={true}
        showStatus={false}
        showThumbs={false}
        infiniteLoop={true}
        autoPlay={true}
        interval={5000}
        selectedItem={currentIndex}
        onChange={setCurrentIndex}
        stopOnHover={true}
        swipeable={true}
        emulateTouch={true}
        dynamicHeight={false}
        centerMode={false}
        className="carousel-container"
        renderArrowPrev={(clickHandler, hasPrev) => {
          return (
            <button
              onClick={clickHandler}
              className="carousel-arrow prev"
              style={{
                position: 'absolute',
                left: 15,
                zIndex: 2,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                padding: '10px 15px',
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              ❮
            </button>
          );
        }}
        renderArrowNext={(clickHandler, hasNext) => {
          return (
            <button
              onClick={clickHandler}
              className="carousel-arrow next"
              style={{
                position: 'absolute',
                right: 15,
                zIndex: 2,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                padding: '10px 15px',
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              ❯
            </button>
          );
        }}
      >
        {carouselData.map((item, index) => (
          <div 
            key={index} 
            style={{ 
              borderRadius: '10px', 
              overflow: 'hidden',
              position: 'relative',
              height: '600px',
              backgroundColor: '#f5f5f5'
            }}
          >
            {!imagesLoaded[index] && !imageErrors[index] && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                <CircularProgress />
                <Typography variant="body2" color="textSecondary">
                  Loading image...
                </Typography>
              </Box>
            )}
            
            {imageErrors[index] && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  width: '80%'
                }}
              >
                <Typography variant="body1" color="error">
                  Unable to load image
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  {item.alt}
                </Typography>
              </Box>
            )}

            <img
              src={getImageSource(item, index)}
              alt={item.alt}
              onLoad={() => handleImageLoad(index)}
              onError={() => handleImageError(index)}
              style={{
                width: '100%',
                height: '600px',
                objectFit: 'cover',
                display: imagesLoaded[index] ? 'block' : 'none'
              }}
            />
            
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '20px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                color: 'white',
                textAlign: 'left'
              }}
            >
              <Typography variant="h6">
                {item.title}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {item.alt}
              </Typography>
            </Box>
          </div>
        ))}
      </Carousel>
    </Box>
  );
}

export default LabCarousel; 