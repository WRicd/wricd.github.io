const projectDataUrl = 'js/projects.json';
const sidebar = document.getElementById('project-sidebar');
const closeButton = document.getElementById('sidebar-close');
const hoverCard = document.getElementById('hover-card');
const fallbackProjects = document.getElementById('fallback-projects');

const sidebarFields = {
  category: document.getElementById('sidebar-category'),
  title: document.getElementById('sidebar-title'),
  desc: document.getElementById('sidebar-desc'),
  tech: document.getElementById('sidebar-tech'),
  status: document.getElementById('sidebar-status'),
  link: document.getElementById('sidebar-link')
};

const loadProjects = async () => {
  const response = await fetch(projectDataUrl);
  if (!response.ok) {
    throw new Error(`Unable to load ${projectDataUrl}`);
  }
  return response.json();
};

const renderFallbackProjects = (projects) => {
  if (!fallbackProjects) return;
  fallbackProjects.innerHTML = '';
  projects.forEach((project) => {
    const link = document.createElement('a');
    link.href = project.page;
    link.className = 'fallback-project';
    link.textContent = project.name;
    fallbackProjects.appendChild(link);
  });
};

const openSidebar = (project) => {
  sidebarFields.category.textContent = project.category;
  sidebarFields.title.textContent = project.name;
  sidebarFields.desc.textContent = project.summary;
  sidebarFields.tech.textContent = project.tech.join(' / ');
  sidebarFields.status.textContent = project.status;
  sidebarFields.link.href = project.page;
  sidebar?.classList.add('visible');
};

const closeSidebar = () => {
  sidebar?.classList.remove('visible');
};

closeButton?.addEventListener('click', closeSidebar);
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeSidebar();
});

const initStarfield = (projects) => {
  if (!window.THREE) {
    renderFallbackProjects(projects);
    document.body.classList.add('three-unavailable');
    return;
  }

  const container = document.getElementById('starfield');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const projectStars = [];
  const clock = new THREE.Clock();

  camera.position.set(0, 0, 14);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const galaxy = new THREE.Group();
  scene.add(galaxy);

  const backgroundGeometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  const colorA = new THREE.Color('#72e6d1');
  const colorB = new THREE.Color('#fff4c9');
  const colorC = new THREE.Color('#ff7aa8');

  for (let i = 0; i < 900; i += 1) {
    const radius = 9 + (i % 47) * 0.34;
    const angle = i * 2.399;
    const arm = Math.sin(i * 0.17) * 1.8;
    positions.push(
      Math.cos(angle) * radius + arm,
      Math.sin(i * 0.41) * 3.2,
      Math.sin(angle) * radius - 18
    );

    const mixed = colorA.clone().lerp(i % 3 === 0 ? colorB : colorC, (i % 11) / 15);
    colors.push(mixed.r, mixed.g, mixed.b);
  }

  backgroundGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  backgroundGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const backgroundMaterial = new THREE.PointsMaterial({
    size: 0.045,
    vertexColors: true,
    transparent: true,
    opacity: 0.85
  });
  const backgroundStars = new THREE.Points(backgroundGeometry, backgroundMaterial);
  galaxy.add(backgroundStars);

  const coreGeometry = new THREE.TorusGeometry(3.4, 0.012, 8, 120);
  const coreMaterial = new THREE.MeshBasicMaterial({ color: '#72e6d1', transparent: true, opacity: 0.24 });
  const coreRing = new THREE.Mesh(coreGeometry, coreMaterial);
  coreRing.rotation.x = Math.PI * 0.58;
  galaxy.add(coreRing);

  projects.forEach((project, index) => {
    const starColor = new THREE.Color(project.color);
    const starGeometry = new THREE.SphereGeometry(0.16 + index * 0.012, 32, 32);
    const starMaterial = new THREE.MeshBasicMaterial({ color: starColor });
    const star = new THREE.Mesh(starGeometry, starMaterial);
    const angle = project.orbit;
    const distance = project.distance;

    star.position.set(
      Math.cos(angle) * distance,
      project.height,
      Math.sin(angle) * distance - 2
    );
    star.userData.project = project;

    const glowGeometry = new THREE.SphereGeometry(0.34 + index * 0.02, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: starColor,
      transparent: true,
      opacity: 0.18
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    star.add(glow);

    projectStars.push(star);
    galaxy.add(star);
  });

  const updatePointer = (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  };

  const getIntersectedStar = () => {
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(projectStars, true).find((hit) => hit.object.userData.project || hit.object.parent?.userData.project);
  };

  renderer.domElement.addEventListener('pointermove', (event) => {
    updatePointer(event);
    const hit = getIntersectedStar();
    const project = hit?.object.userData.project || hit?.object.parent?.userData.project;

    renderer.domElement.style.cursor = project ? 'pointer' : 'default';
    if (project) {
      hoverCard.hidden = false;
      hoverCard.textContent = project.name;
      hoverCard.style.left = `${event.clientX}px`;
      hoverCard.style.top = `${event.clientY}px`;
    } else {
      hoverCard.hidden = true;
    }
  });

  renderer.domElement.addEventListener('pointerleave', () => {
    hoverCard.hidden = true;
    renderer.domElement.style.cursor = 'default';
  });

  renderer.domElement.addEventListener('click', (event) => {
    updatePointer(event);
    const hit = getIntersectedStar();
    const project = hit?.object.userData.project || hit?.object.parent?.userData.project;
    if (project) openSidebar(project);
  });

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', resize);

  const animate = () => {
    const elapsed = clock.getElapsedTime();
    galaxy.rotation.y = elapsed * 0.035;
    backgroundStars.rotation.z = elapsed * 0.018;
    coreRing.rotation.z = elapsed * 0.08;

    projectStars.forEach((star, index) => {
      const scale = 1 + Math.sin(elapsed * 2.1 + index) * 0.08;
      star.scale.setScalar(scale);
    });

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };

  animate();
};

loadProjects()
  .then((projects) => {
    renderFallbackProjects(projects);
    initStarfield(projects);
  })
  .catch(() => {
    if (fallbackProjects) {
      fallbackProjects.innerHTML = '<span class="fallback-error">项目数据暂时无法加载</span>';
    }
  });
