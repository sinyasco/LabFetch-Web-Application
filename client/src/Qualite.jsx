import { FaUserGraduate } from 'react-icons/fa'; // Importer l'icône

const QualiteChercheur = ({ens_chercheur, chercheur, doctorant}) => {
  const data = [
    { label: 'Enseignant-chercheur', value: ens_chercheur },
    { label: 'Chercheur', value: chercheur },
    { label: 'Doctorant', value: doctorant },
  ];

  return (
    <div style={{
      width: '300px',
      margin: 'auto',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      backgroundColor: '#fff',
      fontFamily: 'sans-serif'
    }}>
      <h2 style={{ textAlign: 'center' }}>Qualité de chercheur</h2>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '20px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          backgroundColor: '#3b3b3b',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <FaUserGraduate size={24} color="#fff" />  {/* Icône ici */}
        </div>
      </div>

      {data.map((item, index) => (
        <div key={index} style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '8px 0',
          borderBottom: '1px solid #ddd',
          fontSize: '16px'
        }}>
          <span>{item.label}</span>
          <span>{item.value}</span>
        </div>
      ))}
    </div>
  );
};

export default QualiteChercheur;
